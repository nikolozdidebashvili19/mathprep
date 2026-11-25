import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { TUTOR_MODES } from '@/shared/const/tutor.const';

/** One question a student asked the AI helper about a practice question, and the reply (also the reply cache). */
const TutorMessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'PracticeSession', required: true },
    message: { type: String, required: true },
    /** Replies are cached per mode: an "explain" reply may contain the answer, a "stuck" one never should. */
    mode: { type: String, enum: [...TUTOR_MODES], default: 'explain' },
    /** Lower-case, single-spaced first message: reused for the same question at zero tokens. */
    normalized: { type: String, required: true },
    reply: { type: String, required: true },
    /** True when the reply came from the cache (no model call, not counted against the daily limit). */
    cached: { type: Boolean, default: false },
    provider: { type: String, required: false },
    model: { type: String, required: false },
  },
  { timestamps: true }
);

TutorMessageSchema.index({ userId: 1, createdAt: -1 });
TutorMessageSchema.index({ questionId: 1, normalized: 1 });

export type TutorMessageDocument = InferSchemaType<typeof TutorMessageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TutorMessageModel = mongoose.models.TutorMessage || mongoose.model('TutorMessage', TutorMessageSchema);
