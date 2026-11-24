import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { DIAGNOSTIC_KINDS, DIAGNOSTIC_STATUSES } from '@/shared/const/domain.const';

const SessionAnswerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    // Empty string = the student chose "I don't know".
    answer: { type: String, default: '' },
  },
  { _id: false }
);

/** Per-skill outcome of a quick check: evidence score (-1 weak … +1 strong) and the reasons behind it. */
const SkillSummarySchema = new Schema(
  {
    skillCode: { type: String, required: true },
    score: { type: Number, required: true },
    reasons: { type: [String], default: [] },
  },
  { _id: false }
);

/**
 * One student working through a diagnostic (T-012). Answers are saved as they go so it can be resumed.
 * `full` = one whole past exam (examId set, questions fixed at start). `quick` = adaptive quick check:
 * questions come from many exams and are appended one at a time from the running `ability` estimate.
 */
const DiagnosticSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: [...DIAGNOSTIC_KINDS], default: 'full', required: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: false },
    ability: { type: Number, required: false },
    status: { type: String, enum: [...DIAGNOSTIC_STATUSES], default: 'in_progress', required: true },
    questionIds: { type: [Schema.Types.ObjectId], default: [] },
    answers: { type: [SessionAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    completedAt: { type: Date, required: false },
    skillSummary: { type: [SkillSummarySchema], default: [] },
  },
  { timestamps: true }
);

DiagnosticSessionSchema.index({ userId: 1, examId: 1, status: 1 });
DiagnosticSessionSchema.index({ userId: 1, kind: 1, status: 1 });

export type DiagnosticSessionDocument = InferSchemaType<typeof DiagnosticSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DiagnosticSessionModel =
  mongoose.models.DiagnosticSession || mongoose.model('DiagnosticSession', DiagnosticSessionSchema);
