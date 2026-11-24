import mongoose, { Schema, InferSchemaType } from 'mongoose';

const MasterySnapshotSchema = new Schema(
  {
    skillCode: { type: String, required: true },
    value: { type: Number, required: true },
    confidence: { type: Number, required: true },
  },
  { _id: false }
);

const WeeklyCheckSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    week: { type: Number, required: true, min: 1 },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    masterySnapshot: { type: [MasterySnapshotSchema], default: [] },
    summary: { type: String, required: false },
  },
  { timestamps: true }
);

WeeklyCheckSchema.index({ courseId: 1, week: 1 }, { unique: true });

export type WeeklyCheckDocument = InferSchemaType<typeof WeeklyCheckSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WeeklyCheckModel =
  mongoose.models.WeeklyCheck || mongoose.model('WeeklyCheck', WeeklyCheckSchema);
