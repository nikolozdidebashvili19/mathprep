import { z } from 'zod';

import { MISTAKE_TYPES, PHOTO_PROGRESS } from '@/shared/const/domain.const';

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

const PracticeMistakeSchema = z.object({ type: z.enum(MISTAKE_TYPES), skillCode: z.string(), description: z.string() });

/** The vision model's JSON for one practice photo ("I'm stuck" stage 3 or "find my mistake"). */
export const ModelPracticePhotoSchema = z.object({
  readable: z.boolean(),
  matchesQuestion: z.boolean().default(true),
  progress: z.enum(PHOTO_PROGRESS).catch('stopped'),
  where: z.string().default(''),
  issue: z.string().default(''),
  nextStep: z.string().default(''),
  // One malformed entry (unknown type, missing field) is dropped instead of failing the whole analysis.
  mistakes: z
    .array(z.unknown())
    .default([])
    .transform((list) => list.flatMap((m) => {
      const parsed = PracticeMistakeSchema.safeParse(m);
      return parsed.success ? [parsed.data] : [];
    })),
});
export type ModelPracticePhoto = z.infer<typeof ModelPracticePhotoSchema>;

/** Practice photo upload (multipart text fields): the session and the item the photo belongs to. */
export const UploadPracticePhotoSchema = z.object({
  sessionId: z.string().min(24).max(24),
  itemIndex: z.coerce.number().int().min(0).max(200),
});
export type UploadPracticePhotoType = z.infer<typeof UploadPracticePhotoSchema>;
