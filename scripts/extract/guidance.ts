/**
 * "I'm stuck" guidance per multiple-choice question, generated once offline from the blind-verified solution and
 * stored (content/guidance/<exam-id>.json → Question.guidance). Zero tokens at runtime.
 * restate = what the question asks in very simple words; plan = the problem split into small steps (what to do,
 * not the results); hints = 1–3 nudges, each a little more specific. None of it may reveal the final answer.
 */
import { z } from 'zod';

import type { QuestionImport } from './question-import.ts';

export const MAX_PLAN = 5;
export const MAX_GUIDE_HINTS = 3;

export const ModelGuidanceSchema = z.object({
  number: z.number().int().positive(),
  restate: z.string().min(1),
  plan: z.array(z.string().min(1)).min(2),
  hints: z.array(z.string().min(1)).min(1),
});
export type ModelGuidance = z.infer<typeof ModelGuidanceSchema>;

export const ModelGuidanceBatchSchema = z.preprocess((v) => {
  if (Array.isArray(v)) return { questions: v };
  if (v && typeof v === 'object' && !('questions' in v)) return { questions: [v] };
  return v;
}, z.object({ questions: z.array(ModelGuidanceSchema) }));

export const GuidanceSchema = z.object({
  code: z.string(),
  restate: z.string(),
  plan: z.array(z.string()),
  hints: z.array(z.string()),
  provider: z.string(),
  model: z.string(),
});
export type Guidance = z.infer<typeof GuidanceSchema>;

/** Strips LaTeX/markup noise so "$\frac{3}{4}$" and "\frac{3}{4}" compare equal. */
const squash = (s: string) => s.replace(/[$\s{}\\.,]/g, '').toLowerCase();

/** Announcing the answer: "the answer is …" or naming an option ("ვარიანტი გ", "პასუხი (ბ)"). */
const GIVEAWAY = /პასუხია|(ვარიანტი|პასუხი)\s*\(?[ა-ე]\)?(?![ა-ჰ])/;

/**
 * Rejects guidance that leaks the answer: the correct option's text (when it is specific enough to mean
 * something, ≥ 3 characters), the solution's final step, or a giveaway phrase. Also enforces the shape limits.
 */
export function checkGuidance(g: ModelGuidance, correctOptionText: string, finalStep: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const texts = [g.restate, ...g.plan, ...g.hints];
  const answer = squash(correctOptionText);
  const last = squash(finalStep);
  if (g.plan.length > MAX_PLAN) problems.push(`plan too long (${g.plan.length})`);
  if (g.hints.length > MAX_GUIDE_HINTS) problems.push(`too many hints (${g.hints.length})`);
  for (const t of texts) {
    if (GIVEAWAY.test(t)) problems.push(`giveaway phrase: ${t.slice(0, 60)}`);
    if (answer.length >= 3 && squash(t).includes(answer)) problems.push(`mentions the answer: ${t.slice(0, 60)}`);
    if (last.length >= 8 && squash(t).includes(last)) problems.push(`repeats the final step: ${t.slice(0, 60)}`);
  }
  return { ok: problems.length === 0, problems };
}

const describe = (q: QuestionImport, steps: string[]) =>
  [
    `### Question ${q.number}`,
    q.text,
    `Options: ${q.options.map((o) => `${o.key}) ${o.text}`).join('   ')}`,
    `Verified solution (for you only): ${steps.map((s, i) => `${i + 1}. ${s}`).join(' ')}`,
  ].join('\n');

/** One prompt per batch, text only (the solution already describes any figure that matters). */
export function buildGuidancePrompt(items: { question: QuestionImport; steps: string[] }[]): string {
  return `You are a patient Georgian maths tutor. For each exam question below, write help for a 12th-grade student
who is STUCK and has not answered yet. They must still solve it themselves, so NEVER reveal the final result,
never say which option is correct, and never write the last step of the solution.

For each question return:
- "restate": 1-2 very simple sentences: what the question is really asking, in everyday Georgian (no solving).
- "plan": 2-${MAX_PLAN} short steps describing WHAT to do in order (e.g. "ჯერ იპოვე ...", "მერე შეადარე ..."), without results.
- "hints": 1-${MAX_GUIDE_HINTS} hints, each a little more specific than the previous one; the first names the idea or rule,
  the last may show the first calculation, but none gives the final number or option.
Write in clear, natural Georgian. Maths in LaTeX inside $...$, escaped for JSON (\\\\frac). No introductions.

${items.map((i) => describe(i.question, i.steps)).join('\n\n')}

Return JSON: {"questions": [{"number": 1, "restate": "...", "plan": ["..."], "hints": ["..."]}]}`;
}
