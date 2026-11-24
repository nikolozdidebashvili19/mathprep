import { z } from 'zod';

export const SaveAnswerSchema = z.object({
  sessionId: z.string().min(24).max(24),
  questionId: z.string().min(24).max(24),
  // '' = "I don't know". MC keys are one letter; numeric answers stay short.
  answer: z.string().max(40),
});
export type SaveAnswerType = z.infer<typeof SaveAnswerSchema>;

export const FinishDiagnosticSchema = z.object({
  sessionId: z.string().min(24).max(24),
});
export type FinishDiagnosticType = z.infer<typeof FinishDiagnosticSchema>;

export const QuickAnswerSchema = SaveAnswerSchema;
export type QuickAnswerType = z.infer<typeof QuickAnswerSchema>;
