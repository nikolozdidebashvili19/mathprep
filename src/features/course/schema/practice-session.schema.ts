import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { PRACTICE_SESSION_STATUSES, SESSION_BLOCK_KINDS } from '@/shared/const/domain.const';

/** One step of a daily session: a theory card (no question) or a question. Answered = answeredAt is set. */
const PracticeItemSchema = new Schema(
  {
    blockIndex: { type: Number, required: true },
    kind: { type: String, enum: [...SESSION_BLOCK_KINDS], required: true },
    skillCode: { type: String, required: false },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: false },
    answer: { type: String, required: false },
    correct: { type: Boolean, required: false },
    answeredAt: { type: Date, required: false },
    hintsUsed: { type: Number, default: 0 },
  },
  { _id: false }
);

/** A student's run through one course day (T-020). Items are fixed at start so the day can be resumed. */
const PracticeSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    dayIndex: { type: Number, required: true },
    status: { type: String, enum: [...PRACTICE_SESSION_STATUSES], default: 'in_progress', required: true },
    items: { type: [PracticeItemSchema], default: [] },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

PracticeSessionSchema.index({ courseId: 1, dayIndex: 1 }, { unique: true });

export type PracticeSessionDocument = InferSchemaType<typeof PracticeSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PracticeSessionModel =
  mongoose.models.PracticeSession || mongoose.model('PracticeSession', PracticeSessionSchema);
