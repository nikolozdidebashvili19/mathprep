import { z } from 'zod';

import { CONTENT_STATUSES } from '@/shared/const/domain.const';

const WorkedExampleSchema = z.object({
  problem: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
  answer: z.string().min(1),
});

/**
 * One theory card per skill (content/theory/<code>.json). Original text (not copied from textbooks), Georgian,
 * maths in $...$. Two layers: basics (idea, rules, easy example) for beginners, exam level for strong students.
 */
export const TheoryCardSchema = z.object({
  code: z.string().regex(/^[A-Z][0-9]{1,2}$/),
  status: z.enum(CONTENT_STATUSES),
  idea: z.string().min(1),
  rules: z.array(z.string().min(1)).min(1),
  example: WorkedExampleSchema,
  examExample: WorkedExampleSchema,
  mistakes: z.array(z.string().min(1)).min(1),
  examTip: z.string().min(1),
});
export type TheoryCardType = z.infer<typeof TheoryCardSchema>;
