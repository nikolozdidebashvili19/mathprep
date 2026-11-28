import mongoose, { Schema, InferSchemaType } from 'mongoose';

/**
 * Spaced repetition for one student and skill (T-022). `learnedAt` = the day the skill was first practised (start of
 * the UTC day); reviews come REVISION_INTERVALS_DAYS after it (1, 3, 7, 14 days). `step` = reviews passed so far;
 * a wrong review answer starts the cycle again from that day. `nextReviewAt` null = all reviews passed (retained).
 * Kept apart from Mastery on purpose: the mastery rebuild replaces those documents and would lose the schedule.
 */
const ReviewScheduleSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skillCode: { type: String, required: true },
    learnedAt: { type: Date, required: true },
    step: { type: Number, default: 0, required: true },
    nextReviewAt: { type: Date, default: null },
    lastReviewedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

ReviewScheduleSchema.index({ userId: 1, skillCode: 1 }, { unique: true });
ReviewScheduleSchema.index({ userId: 1, nextReviewAt: 1 });

export type ReviewScheduleDocument = InferSchemaType<typeof ReviewScheduleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ReviewScheduleModel = mongoose.models.ReviewSchedule || mongoose.model('ReviewSchedule', ReviewScheduleSchema);
