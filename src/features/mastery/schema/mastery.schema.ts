import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { MASTERY_STAGES } from '@/shared/const/domain.const';

const MistakeCountsSchema = new Schema(
  {
    conceptual: { type: Number, default: 0 },
    calculation: { type: Number, default: 0 },
    misread: { type: Number, default: 0 },
    incomplete: { type: Number, default: 0 },
  },
  { _id: false }
);

const MasterySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    skillCode: { type: String, required: true },
    value: { type: Number, min: 0, max: 1, default: 0, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0, required: true },
    observations: { type: Number, default: 0, required: true },
    stage: { type: String, enum: [...MASTERY_STAGES], default: 'foundation', required: true },
    // Highest difficulty answered correctly; mastery is capped below "solid" until this reaches exam level.
    hardestCorrect: { type: Number, default: 0 },
    mistakeCounts: { type: MistakeCountsSchema, default: () => ({}) },
    nextReviewAt: { type: Date, required: false },
  },
  { timestamps: true }
);

MasterySchema.index({ userId: 1, skillCode: 1 }, { unique: true });

export type MasteryDocument = InferSchemaType<typeof MasterySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MasteryModel = mongoose.models.Mastery || mongoose.model('Mastery', MasterySchema);
