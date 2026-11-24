import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { CONTENT_STATUSES, MAX_DIFFICULTY, MIN_DIFFICULTY } from '@/shared/const/domain.const';

const TemplateSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    skillCode: { type: String, required: true },
    difficulty: { type: Number, min: MIN_DIFFICULTY, max: MAX_DIFFICULTY, required: true },
    generatorKey: { type: String, required: true },
    description: { type: String, required: false },
    status: { type: String, enum: [...CONTENT_STATUSES], default: 'draft', required: true },
  },
  { timestamps: true }
);

TemplateSchema.index({ skillCode: 1, difficulty: 1 });

export type TemplateDocument = InferSchemaType<typeof TemplateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TemplateModel = mongoose.models.Template || mongoose.model('Template', TemplateSchema);
