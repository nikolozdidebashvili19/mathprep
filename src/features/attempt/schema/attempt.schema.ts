import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { ATTEMPT_CONTEXTS, GRADING_STATUSES, MISTAKE_TYPES } from '@/shared/const/domain.const';

const AttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    context: { type: String, enum: [...ATTEMPT_CONTEXTS], required: true },
    contextId: { type: Schema.Types.ObjectId, required: false },
    answer: { type: String, required: false },
    photoKey: { type: String, required: false },
    points: { type: Number, default: 0, required: true },
    maxPoints: { type: Number, required: true },
    firstErrorStep: { type: Number, required: false },
    mistakeType: { type: String, enum: [...MISTAKE_TYPES], required: false },
    failedSkillCode: { type: String, required: false },
    graderConfidence: { type: Number, min: 0, max: 1, required: false },
    // Hints revealed before answering (practice); each lowers the answer's weight in mastery.
    hintsUsed: { type: Number, default: 0 },
    gradingStatus: { type: String, enum: [...GRADING_STATUSES], default: 'pending', required: true },
  },
  { timestamps: true }
);

AttemptSchema.index({ userId: 1, createdAt: -1 });
AttemptSchema.index({ userId: 1, questionId: 1 });

export type AttemptDocument = InferSchemaType<typeof AttemptSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AttemptModel = mongoose.models.Attempt || mongoose.model('Attempt', AttemptSchema);
