import { z } from 'zod';

import { TUTOR_MAX_HISTORY, TUTOR_MAX_MESSAGE } from '@/shared/const/tutor.const';

export const TutorTurnSchema = z.object({
  role: z.enum(['student', 'tutor']),
  text: z.string().min(1).max(1500),
});

export const AskTutorSchema = z.object({
  sessionId: z.string().min(24).max(24),
  itemIndex: z.number().int().min(0).max(200),
  message: z.string().trim().min(2).max(TUTOR_MAX_MESSAGE),
  history: z.array(TutorTurnSchema).max(TUTOR_MAX_HISTORY).default([]),
});
export type AskTutorType = z.infer<typeof AskTutorSchema>;

/** Form shape on the client (the message input). */
export const TutorMessageFormSchema = z.object({ message: z.string().trim().min(2).max(TUTOR_MAX_MESSAGE) });
export type TutorMessageFormType = z.infer<typeof TutorMessageFormSchema>;

export const ModelTutorReplySchema = z.object({ reply: z.string().min(1) });
