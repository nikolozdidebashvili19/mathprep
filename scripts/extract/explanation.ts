/**
 * Step-by-step explanations for multiple-choice questions, generated once offline and stored
 * (content/explanations/<exam-id>.json → Question.solutionSteps / commonMistakes). Zero tokens at runtime.
 * Verified = the model's own final answer matches the answer key. A mismatch is re-asked once with the key
 * ("guided"); guided explanations are kept but flagged for admin review first.
 */
import { z } from 'zod';

import type { QuestionImport } from './question-import.ts';

export const MAX_STEPS = 6;

export const ModelExplanationSchema = z.object({
  number: z.number().int().positive(),
  steps: z.array(z.string().min(1)).min(1),
  finalAnswer: z.string(),
  commonMistake: z.string().optional().default(''),
});
export type ModelExplanation = z.infer<typeof ModelExplanationSchema>;

/** The model sometimes drops the wrapper and returns a bare array (or one bare object). */
export const ModelExplanationBatchSchema = z.preprocess((v) => {
  if (Array.isArray(v)) return { questions: v };
  if (v && typeof v === 'object' && !('questions' in v)) return { questions: [v] };
  return v;
}, z.object({ questions: z.array(ModelExplanationSchema) }));

export const ExplanationSchema = z.object({
  code: z.string(),
  steps: z.array(z.string()),
  commonMistake: z.string(),
  method: z.enum(['blind', 'guided']),
  verified: z.boolean(),
  provider: z.string(),
  model: z.string(),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

/** "ბ", "ბ)", " (ბ) " → "ბ". */
export const normalizeOption = (raw: string) => raw.replace(/[()\s.]/g, '').slice(0, 1);

export function checkExplanation(e: ModelExplanation, answerKey: string): { verified: boolean; problems: string[] } {
  const problems: string[] = [];
  if (normalizeOption(e.finalAnswer) !== normalizeOption(answerKey)) problems.push(`final answer ${e.finalAnswer} ≠ key ${answerKey}`);
  if (e.steps.length > MAX_STEPS + 2) problems.push(`too many steps (${e.steps.length})`);
  return { verified: problems.length === 0, problems };
}

const describe = (q: QuestionImport, imageIndex: number | null, givenAnswer: string | null) =>
  [
    `### Question ${q.number}`,
    q.text,
    `Options: ${q.options.map((o) => `${o.key}) ${o.text}`).join('   ')}`,
    imageIndex !== null ? `(Figure: image #${imageIndex + 1})` : '',
    givenAnswer ? `The correct option is ${givenAnswer}. Show the solution that leads to it.` : '',
  ]
    .filter(Boolean)
    .join('\n');

/** One prompt per batch; `guided` passes the answer key (second attempt only). */
export function buildExplanationPrompt(questions: QuestionImport[], imageOrder: number[], guided: boolean): string {
  const blocks = questions.map((q) => describe(q, imageOrder.includes(q.number) ? imageOrder.indexOf(q.number) : null, guided ? q.answer : null));
  return `You are an experienced Georgian maths teacher. Solve each multiple-choice question from the Georgian national
university-entrance exam and explain the solution to a 12th-grade student who finds it hard.

Rules:
- Write in clear, natural Georgian. Maths in LaTeX inside $...$, escaped for JSON (\\\\frac).
- "steps": 2-${MAX_STEPS} short steps, one idea per step, each a single line. Start from what is given; name the rule you use.
- "finalAnswer": the letter of the correct option only (ა, ბ, გ or დ).
- "commonMistake": one sentence on the most likely mistake a student makes here (Georgian).
- No introductions, no repetition of the question text.

${blocks.join('\n\n')}

Return JSON: {"questions": [{"number": 1, "steps": ["..."], "finalAnswer": "ა", "commonMistake": "..."}]}`;
}
