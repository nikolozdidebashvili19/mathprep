import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { STUDENT_LEVELS } from '@/shared/const/course.const';
import { COURSE_STATUSES } from '@/shared/const/domain.const';

const CourseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    durationDays: { type: Number, required: true, min: 1 },
    minutesPerDay: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    targetScore: { type: Number, required: false },
    /** From the diagnostic score at planning time: how much prior knowledge the plan assumes. */
    level: { type: String, enum: [...STUDENT_LEVELS], default: 'advanced' },
    // Planner output (T-018): selected skills in teaching order, the ones that did not fit, and coverage.
    skills: { type: [String], default: [] },
    omittedSkills: { type: [String], default: [] },
    coverage: { type: Number, default: 0 },
    realistic: { type: Boolean, default: true },
    status: { type: String, enum: [...COURSE_STATUSES], default: 'active', required: true },
  },
  { timestamps: true }
);

CourseSchema.index({ userId: 1, status: 1 });

export type CourseDocument = InferSchemaType<typeof CourseSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CourseModel = mongoose.models.Course || mongoose.model('Course', CourseSchema);
