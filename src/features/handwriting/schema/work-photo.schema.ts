import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { ANALYSIS_STATUSES, MISTAKE_TYPES } from '@/shared/const/domain.const';

const WorkMistakeSchema = new Schema(
  {
    type: { type: String, enum: [...MISTAKE_TYPES], required: true },
    skillCode: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

/** What the vision model found in the student's handwritten working. */
const WorkAnalysisSchema = new Schema(
  {
    status: { type: String, enum: [...ANALYSIS_STATUSES], default: 'pending', required: true },
    readable: { type: Boolean, required: false },
    matchesQuestion: { type: Boolean, required: false },
    workShown: { type: Boolean, required: false },
    approach: { type: String, required: false },
    mistakes: { type: [WorkMistakeSchema], default: [] },
    skillsShown: { type: [String], default: [] },
    feedback: { type: String, required: false },
    provider: { type: String, required: false },
    model: { type: String, required: false },
    error: { type: String, required: false },
    analyzedAt: { type: Date, required: false },
  },
  { _id: false }
);

/**
 * A photo of the student's handwritten working for one diagnostic question.
 * Stored in MongoDB for now (compressed in the browser to a few hundred KB); moves to private object
 * storage in T-014 before launch. Photos of minors: retention rules in T-027.
 */
const WorkPhotoSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'DiagnosticSession', required: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    analysis: { type: WorkAnalysisSchema, default: () => ({}) },
  },
  { timestamps: true }
);

WorkPhotoSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

export type WorkPhotoDocument = InferSchemaType<typeof WorkPhotoSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WorkPhotoModel = mongoose.models.WorkPhoto || mongoose.model('WorkPhoto', WorkPhotoSchema);
