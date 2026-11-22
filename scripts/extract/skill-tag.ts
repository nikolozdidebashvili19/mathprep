/**
 * T-009: AI skill tagging. What the model returns per question, the checks it must pass, the record written to
 * content/tags/<exam-id>.json (applied to draft questions by the seed), and the examWeight recomputation.
 */
import { z } from 'zod';

import type { QuestionImport } from './question-import.ts';

export const MIN_TAG_DIFFICULTY = 1;
export const MAX_TAG_DIFFICULTY = 5;
export const MAX_SKILLS_PER_QUESTION = 3;

export type TagSkill = { code: string; nameEn: string; topic: string };

/** Raw model output for one question. */
export const ModelTagSchema = z.object({
  number: z.number().int().positive(),
  skills: z.array(z.string()),
  primarySkill: z.string().nullable(),
  difficulty: z.number().int().min(MIN_TAG_DIFFICULTY).max(MAX_TAG_DIFFICULTY),
  offProgram: z.boolean(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional().default(''),
});

export type ModelTag = z.infer<typeof ModelTagSchema>;

/** The model often drops the wrapper and returns the bare array (or, for one question, the bare object). */
export const ModelTagBatchSchema = z.preprocess((v) => {
  if (Array.isArray(v)) return { questions: v };
  if (v && typeof v === 'object' && !('questions' in v)) return { questions: [v] };
  return v;
}, z.object({ questions: z.array(ModelTagSchema) }));

export const SkillTagSchema = z.object({
  code: z.string(),
  skills: z.array(z.string()),
  primarySkill: z.string().nullable(),
  difficulty: z.number().int().min(MIN_TAG_DIFFICULTY).max(MAX_TAG_DIFFICULTY),
  offProgram: z.boolean(),
  confidence: z.number(),
  notes: z.string(),
  problems: z.array(z.string()),
  provider: z.string(),
  model: z.string(),
});

export type SkillTag = z.infer<typeof SkillTagSchema>;

/** Checks that need no model; anything returned sends the tag to admin review with a flag. */
export function checkTag(tag: ModelTag, knownCodes: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const unknown = tag.skills.filter((s) => !knownCodes.has(s));
  if (unknown.length) problems.push(`unknown skill codes: ${unknown.join(', ')}`);
  if (tag.skills.length > MAX_SKILLS_PER_QUESTION) problems.push(`too many skills (${tag.skills.length})`);
  if (!tag.offProgram && tag.skills.length === 0) problems.push('no skills given');
  if (tag.skills.length > 0 && (!tag.primarySkill || !tag.skills.includes(tag.primarySkill))) {
    problems.push('primary skill is not one of the skills');
  }
  if (tag.confidence < 0.6) problems.push(`low model confidence (${tag.confidence})`);
  return problems;
}

/** Drops unknown codes and fixes the primary skill so a flagged tag is still usable as a draft. */
export function toSkillTag(code: string, tag: ModelTag, knownCodes: ReadonlySet<string>, by: { provider: string; model: string }): SkillTag {
  const problems = checkTag(tag, knownCodes);
  const skills = [...new Set(tag.skills.filter((s) => knownCodes.has(s)))].slice(0, MAX_SKILLS_PER_QUESTION);
  const primarySkill = tag.primarySkill && skills.includes(tag.primarySkill) ? tag.primarySkill : skills[0] ?? null;
  return {
    code,
    skills,
    primarySkill,
    difficulty: tag.difficulty,
    offProgram: tag.offProgram,
    confidence: tag.confidence,
    notes: tag.notes,
    problems,
    provider: by.provider,
    model: by.model,
  };
}

const describeQuestion = (q: QuestionImport, imageIndex: number | null) => {
  const options = q.options.map((o) => `${o.key}) ${o.text}`).join('   ');
  const lines = [
    `### Question ${q.number} (${q.type === 'multiple_choice' ? 'multiple choice' : 'written answer'}, ${q.maxPoints} pt)`,
    q.text,
  ];
  if (options) lines.push(`Options: ${options}`);
  if (q.answer) lines.push(`Correct answer: ${q.answer}`);
  if (imageIndex !== null) lines.push(`(Figure: image #${imageIndex + 1})`);
  return lines.join('\n');
};

/** One prompt per batch. `imageOrder` lists question numbers in the order their figures are attached. */
export function buildTagPrompt(year: number, questions: QuestionImport[], skills: TagSkill[], imageOrder: number[]): string {
  const skillList = skills.map((s) => `${s.code}: ${s.nameEn}`).join('\n');
  const blocks = questions.map((q) => describeQuestion(q, imageOrder.includes(q.number) ? imageOrder.indexOf(q.number) : null));
  return `You are tagging questions from the ${year} Georgian national university-entrance exam in mathematics
with the skills a student needs to solve them. Questions are in Georgian with LaTeX.

Skill list (use ONLY these codes):
${skillList}

For every question return:
- "skills": 1-${MAX_SKILLS_PER_QUESTION} codes the solution really needs, most important first. Do not list trivial arithmetic
  that any question needs; list a basic skill only if it is a real step.
- "primarySkill": the one skill the question is mainly testing (must be in "skills").
- "difficulty": 1-5 for a typical 12th-grade student: 1 = one routine step, 2 = standard exercise, 3 = two or three
  steps or a common trap, 4 = multi-step or needs an insight, 5 = hardest questions on the paper.
- "offProgram": true only if the question needs a topic no skill in the list covers; then "skills" may be empty.
- "confidence": 0-1, how sure you are of the skills.
- "notes": anything uncertain, or an empty string.

${blocks.join('\n\n')}

Return JSON: {"questions": [{"number": 1, "skills": ["A4"], "primarySkill": "A4", "difficulty": 2,
"offProgram": false, "confidence": 0.9, "notes": ""}]} with one entry per question above, in the same order.`;
}

/** Older formats count less: the newest papers are closest to what students will sit. */
export function recencyWeight(year: number): number {
  if (year >= 2023) return 1;
  if (year >= 2021) return 0.6;
  return 0.3;
}

/** Share of a question's points given to each skill: primary gets PRIMARY_SHARE, the rest split what is left. */
export const PRIMARY_SHARE = 0.6;
/** examWeight must stay positive (skill validation), so skills never seen on a paper get this floor. */
export const MIN_EXAM_WEIGHT = 0.1;

export type WeightInput = { year: number; examId: string; maxPoints: number; tag: SkillTag };

/**
 * Expected exam points per skill on a recency-weighted average paper:
 * Σ(points × skill share × year weight) / Σ(year weight over exams). Off-program questions are skipped.
 */
export function computeExamWeights(items: WeightInput[], skillCodes: string[]): Record<string, number> {
  const examWeights = new Map<string, number>();
  const totals = new Map(skillCodes.map((c) => [c, 0]));
  for (const { year, examId, maxPoints, tag } of items) {
    examWeights.set(examId, recencyWeight(year));
    if (tag.offProgram || !tag.primarySkill) continue;
    const others = tag.skills.filter((s) => s !== tag.primarySkill);
    const primaryShare = others.length ? PRIMARY_SHARE : 1;
    const add = (code: string, share: number) => totals.set(code, (totals.get(code) ?? 0) + maxPoints * share * recencyWeight(year));
    add(tag.primarySkill, primaryShare);
    for (const s of others) add(s, (1 - PRIMARY_SHARE) / others.length);
  }
  const examTotal = [...examWeights.values()].reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(
    skillCodes.map((c) => [c, Math.max(MIN_EXAM_WEIGHT, Math.round(((totals.get(c) ?? 0) / examTotal) * 100) / 100)])
  );
}
