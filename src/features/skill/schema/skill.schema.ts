import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { CONTENT_STATUSES } from '@/shared/const/domain.const';

const WorkedExampleSchema = new Schema(
  { problem: { type: String, required: true }, steps: { type: [String], default: [] }, answer: { type: String, required: true } },
  { _id: false }
);

/** Theory card (T-020): basics for beginners + exam level for strong students. Seeded from content/theory/. */
const TheoryCardSchema = new Schema(
  {
    status: { type: String, enum: [...CONTENT_STATUSES], default: 'draft', required: true },
    idea: { type: String, required: true },
    rules: { type: [String], default: [] },
    example: { type: WorkedExampleSchema, required: true },
    examExample: { type: WorkedExampleSchema, required: true },
    mistakes: { type: [String], default: [] },
    examTip: { type: String, required: true },
  },
  { _id: false }
);

const SkillSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    topic: { type: String, required: true },
    nameKa: { type: String, required: true },
    nameEn: { type: String, required: true },
    examWeight: { type: Number, required: true, min: 0 },
    minPracticeMinutes: { type: Number, required: true, min: 0 },
    prerequisites: { type: [String], default: [] },
    theoryCard: { type: TheoryCardSchema, required: false },
  },
  { timestamps: true }
);

export type SkillDocument = InferSchemaType<typeof SkillSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SkillModel = mongoose.models.Skill || mongoose.model('Skill', SkillSchema);
