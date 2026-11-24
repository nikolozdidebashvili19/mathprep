import { z } from 'zod';

import { MISTAKE_TYPES } from '@/shared/const/domain.const';

export const UploadWorkPhotoSchema = z.object({
  sessionId: z.string().min(24).max(24),
  questionId: z.string().min(24).max(24),
});
export type UploadWorkPhotoType = z.infer<typeof UploadWorkPhotoSchema>;

/** The vision model's JSON for one photo. Skill codes are checked against the allowed list in the service. */
export const ModelWorkAnalysisSchema = z.object({
  readable: z.boolean(),
  matchesQuestion: z.boolean(),
  workShown: z.boolean(),
  approach: z.string().default(''),
  mistakes: z
    .array(z.object({ type: z.enum(MISTAKE_TYPES), skillCode: z.string(), description: z.string() }))
    .default([]),
  skillsShown: z.array(z.string()).default([]),
  feedback: z.string().default(''),
});
export type ModelWorkAnalysis = z.infer<typeof ModelWorkAnalysisSchema>;
