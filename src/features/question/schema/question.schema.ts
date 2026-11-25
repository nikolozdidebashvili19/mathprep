import mongoose, { Schema, InferSchemaType } from 'mongoose';

import {
  CONTENT_STATUSES,
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  QUESTION_SOURCES,
  QUESTION_TYPES,
} from '@/shared/const/domain.const';

const QuestionSkillSchema = new Schema(
  {
    skillCode: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const QuestionOptionSchema = new Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

/** "I'm stuck" guidance (content/guidance/): made once offline from the verified solution, never the answer. */
const QuestionGuidanceSchema = new Schema(
  {
    restate: { type: String, required: true },
    plan: { type: [String], default: [] },
    hints: { type: [String], default: [] },
  },
  { _id: false }
);

const QuestionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: false },
    number: { type: Number, required: false },
    source: { type: String, enum: [...QUESTION_SOURCES], required: true },
    sourcePage: { type: Number, required: false },
    formatEra: { type: String, required: false },
    offProgram: { type: Boolean, default: false },
    type: { type: String, enum: [...QUESTION_TYPES], required: true },
    difficulty: { type: Number, min: MIN_DIFFICULTY, max: MAX_DIFFICULTY, required: true },
    text: { type: String, required: true },
    images: { type: [String], default: [] },
    options: { type: [QuestionOptionSchema], default: [] },
    // Written questions have no single answer (graded by markingCriteria), so this may be empty.
    answer: { type: String, required: false, default: '' },
    maxPoints: { type: Number, required: true, min: 0 },
    markingCriteria: { type: String, required: false },
    solutionSteps: { type: [String], default: [] },
    commonMistakes: { type: [String], default: [] },
    guidance: { type: QuestionGuidanceSchema, required: false },
    skills: { type: [QuestionSkillSchema], default: [] },
    primarySkill: { type: String, required: false },
    status: { type: String, enum: [...CONTENT_STATUSES], default: 'draft', required: true },
  },
  { timestamps: true }
);

QuestionSchema.index({ status: 1, primarySkill: 1, difficulty: 1 });
QuestionSchema.index({ examId: 1, number: 1 });

export type QuestionDocument = InferSchemaType<typeof QuestionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const QuestionModel = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
