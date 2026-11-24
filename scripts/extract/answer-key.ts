/**
 * T-008: shape + consistency rules for content/answer-keys/<exam-id>.json.
 * MC answers are Georgian option letters; the remaining questions are written/short-answer
 * ones graded by the official criteria (`final` holds the printed final answer in LaTeX when known).
 */
import { z } from 'zod';

export const MC_LETTERS = ['ა', 'ბ', 'გ', 'დ'] as const;

export const AnswerKeySchema = z.object({
  examId: z.string().regex(/^\d{4}-V\d$/),
  source: z.string().min(1),
  method: z.string().min(1),
  verified: z.boolean(),
  mc: z.record(z.string().regex(/^\d+$/), z.enum(MC_LETTERS)),
  written: z.array(z.number().int().positive()),
  final: z.record(z.string().regex(/^\d+$/), z.string().min(1)).optional(),
});

export type AnswerKey = z.infer<typeof AnswerKeySchema>;

/** Returns human-readable problems; an empty array means the key is consistent. */
export function checkAnswerKey(key: AnswerKey, expectedQuestionCount?: number): string[] {
  const problems: string[] = [];
  const mcNumbers = Object.keys(key.mc).map(Number).sort((a, b) => a - b);
  const all = [...mcNumbers, ...key.written];

  all.forEach((n, i) => {
    if (n !== i + 1) problems.push(`question numbers must run 1..N without gaps; position ${i + 1} is ${n}`);
  });
  if (expectedQuestionCount !== undefined && all.length !== expectedQuestionCount) {
    problems.push(`covers ${all.length} questions, exam has ${expectedQuestionCount}`);
  }
  for (const n of Object.keys(key.final ?? {}).map(Number)) {
    if (!key.written.includes(n)) problems.push(`final answer given for ${n}, which is not a written question`);
  }
  return problems;
}
