import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { SESSION_BLOCK_KINDS } from '@/shared/const/domain.const';

const SessionBlockSchema = new Schema(
  {
    kind: { type: String, enum: [...SESSION_BLOCK_KINDS], required: true },
    skillCode: { type: String, required: false },
    minutes: { type: Number, required: true, min: 0 },
    questionCount: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const CourseDaySchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    dayIndex: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    blocks: { type: [SessionBlockSchema], default: [] },
    completed: { type: Boolean, default: false, required: true },
  },
  { timestamps: true }
);

CourseDaySchema.index({ courseId: 1, dayIndex: 1 }, { unique: true });

export type CourseDayDocument = InferSchemaType<typeof CourseDaySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CourseDayModel = mongoose.models.CourseDay || mongoose.model('CourseDay', CourseDaySchema);
