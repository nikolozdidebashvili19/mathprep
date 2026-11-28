import mongoose, { Schema, InferSchemaType } from 'mongoose';

import { SCAFFOLD_LEVELS } from '@/shared/const/course.const';
import { PRACTICE_SESSION_STATUSES, SESSION_BLOCK_KINDS } from '@/shared/const/domain.const';

/** One step of a daily session: a theory card (no question) or a question. Answered = answeredAt is set. */
const PracticeItemSchema = new Schema(
  {
    blockIndex: { type: Number, required: true },
    kind: { type: String, enum: [...SESSION_BLOCK_KINDS], required: true },
    skillCode: { type: String, required: false },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: false },
    answer: { type: String, required: false },
    correct: { type: Boolean, required: false },
    answeredAt: { type: Date, required: false },
    /** Real hints revealed by "I'm stuck": lower XP and the answer's mastery weight. */
    hintsUsed: { type: Number, default: 0 },
    /** "I'm stuck" stage reached (0 = not pressed; stages 1–4, see hints.ts). */
    stuckStage: { type: Number, default: 0 },
    /** Free guidance shown up front (guided problem solving: full → light → solo). */
    scaffold: { type: String, enum: [...SCAFFOLD_LEVELS], default: 'none' },
    /** Inserted after a wrong answer: an easier question on the same skill (one per original question). */
    secondChance: { type: Boolean, default: false },
    /** Inserted by "I'm stuck" stage 4 before the original question; `reinforcementSkill` = the weakness it targets. */
    reinforcement: { type: Boolean, default: false },
    reinforcementSkill: { type: String, required: false },
    /** On the original question: how many reinforcement questions stage 4 inserted before it (0 = none found). */
    reinforcedWith: { type: Number, required: false },
    /** Warm-up before a new lesson (a skill learnt earlier) and spaced reviews (1 / 3 / 7 / 14 days after learning). */
    warmup: { type: Boolean, default: false },
    review: { type: Boolean, default: false },
  },
  { _id: false }
);

/** A student's run through one course day (T-020). Items are fixed at start so the day can be resumed. */
const PracticeSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    dayIndex: { type: Number, required: true },
    status: { type: String, enum: [...PRACTICE_SESSION_STATUSES], default: 'in_progress', required: true },
    items: { type: [PracticeItemSchema], default: [] },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true }
);

PracticeSessionSchema.index({ courseId: 1, dayIndex: 1 }, { unique: true });

export type PracticeSessionDocument = InferSchemaType<typeof PracticeSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const PracticeSessionModel =
  mongoose.models.PracticeSession || mongoose.model('PracticeSession', PracticeSessionSchema);
