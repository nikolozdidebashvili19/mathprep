import mongoose, { Schema, InferSchemaType } from 'mongoose';

const ExamSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    year: { type: Number, required: true },
    variant: { type: Number, required: true },
    formatEra: { type: String, required: true },
    sourceFile: { type: String, required: true },
    answerKeyFile: { type: String, required: true },
    pageCount: { type: Number, required: true },
    usableForDiagnostic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ExamSchema.index({ year: 1, variant: 1 }, { unique: true });

export type ExamDocument = InferSchemaType<typeof ExamSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ExamModel = mongoose.models.Exam || mongoose.model('Exam', ExamSchema);
