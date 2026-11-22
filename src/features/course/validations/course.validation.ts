import { z } from 'zod';

import { COURSE_DURATION_MONTHS, DAILY_MINUTES_OPTIONS } from '@/shared/const/domain.const';

export const CreateCourseSchema = z.object({
  months: z.literal([...COURSE_DURATION_MONTHS]),
  minutesPerDay: z.literal([...DAILY_MINUTES_OPTIONS]),
});
export type CreateCourseType = z.infer<typeof CreateCourseSchema>;

export const PracticeHintSchema = z.object({
  sessionId: z.string().min(24).max(24),
  itemIndex: z.number().int().min(0).max(200),
});
export type PracticeHintType = z.infer<typeof PracticeHintSchema>;

export const PracticeAnswerSchema = z.object({
  sessionId: z.string().min(24).max(24),
  itemIndex: z.number().int().min(0).max(200),
  // '' for a theory card ("got it"); MC keys are one letter.
  answer: z.string().max(40),
});
export type PracticeAnswerType = z.infer<typeof PracticeAnswerSchema>;
