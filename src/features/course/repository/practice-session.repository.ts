import { Types } from 'mongoose';

import { PracticeSessionDocument, PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import { BlockKind, ScaffoldLevel } from '@/features/course/types/course.types';
import { mongo } from '@/shared/lib/mongo';

export type NewPracticeItem = {
  blockIndex: number;
  kind: BlockKind;
  skillCode: string | null;
  questionId: string | null;
  scaffold?: ScaffoldLevel;
  secondChance?: boolean;
  reinforcement?: boolean;
  reinforcementSkill?: string | null;
  warmup?: boolean;
  review?: boolean;
};

const toStored = (i: NewPracticeItem) => ({
  ...i,
  skillCode: i.skillCode ?? undefined,
  questionId: i.questionId ?? undefined,
  reinforcementSkill: i.reinforcementSkill ?? undefined,
});

export const practiceSessionRepository = {
  async findById(id: string): Promise<PracticeSessionDocument | null> {
    await mongo.connect();
    return PracticeSessionModel.findById(id).lean<PracticeSessionDocument>().exec();
  },

  async findByCourseDay(courseId: string, dayIndex: number): Promise<PracticeSessionDocument | null> {
    await mongo.connect();
    return PracticeSessionModel.findOne({ courseId, dayIndex }).lean<PracticeSessionDocument>().exec();
  },

  /** All of a student's sessions (any course), oldest first: the source for XP, streaks and learnt theory. */
  async findByUser(userId: string): Promise<PracticeSessionDocument[]> {
    await mongo.connect();
    return PracticeSessionModel.find({ userId }).sort({ createdAt: 1 }).lean<PracticeSessionDocument[]>().exec();
  },

  async create(input: { userId: string; courseId: string; dayIndex: number; items: NewPracticeItem[] }): Promise<PracticeSessionDocument> {
    await mongo.connect();
    const doc = await PracticeSessionModel.create({ ...input, items: input.items.map(toStored) });
    return doc.toObject() as PracticeSessionDocument;
  },

  /** Records one item's answer only if it is still unanswered (a double submit matches nothing → 0). */
  async recordAnswer(sessionId: string, itemIndex: number, answer: string, correct: boolean): Promise<number> {
    await mongo.connect();
    const path = `items.${itemIndex}`;
    const result = await PracticeSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress', [`${path}.answeredAt`]: { $exists: false } },
      { $set: { [`${path}.answer`]: answer, [`${path}.correct`]: correct, [`${path}.answeredAt`]: new Date() } }
    ).exec();
    return result.matchedCount;
  },

  /**
   * Reveals the next "I'm stuck" stage while the item is unanswered and still at `expectedStage` (atomic; 0 = nothing
   * changed). `hintCost` real hints are added; `reinforcedWith` is stored when stage 4 inserts easier questions.
   */
  async revealStage(sessionId: string, itemIndex: number, expectedStage: number, hintCost: number, reinforcedWith?: number): Promise<number> {
    await mongo.connect();
    const path = `items.${itemIndex}`;
    const stage = expectedStage === 0 ? { $in: [0, null] } : expectedStage;
    const set: Record<string, number> = { [`${path}.stuckStage`]: expectedStage + 1 };
    if (reinforcedWith !== undefined) set[`${path}.reinforcedWith`] = reinforcedWith;
    const result = await PracticeSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress', [`${path}.answeredAt`]: { $exists: false }, [`${path}.stuckStage`]: stage },
      { $set: set, $inc: { [`${path}.hintsUsed`]: hintCost } }
    ).exec();
    return result.matchedCount;
  },

  /** Inserts questions at `position` (second chance after an answer, reinforcement before one) while the session runs. */
  async insertItems(sessionId: string, position: number, items: NewPracticeItem[]): Promise<number> {
    await mongo.connect();
    const result = await PracticeSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress' },
      { $push: { items: { $each: items.map(toStored), $position: position } } }
    ).exec();
    return result.matchedCount;
  },

  /** Swaps an unanswered item's question (adaptive difficulty); only if it still holds `expectedQuestionId`. */
  async replaceQuestion(sessionId: string, itemIndex: number, expectedQuestionId: string, questionId: string): Promise<number> {
    await mongo.connect();
    const path = `items.${itemIndex}`;
    const result = await PracticeSessionModel.updateOne(
      {
        _id: sessionId,
        status: 'in_progress',
        [`${path}.answeredAt`]: { $exists: false },
        [`${path}.questionId`]: new Types.ObjectId(expectedQuestionId),
      },
      { $set: { [`${path}.questionId`]: new Types.ObjectId(questionId) } }
    ).exec();
    return result.matchedCount;
  },

  async complete(sessionId: string): Promise<number> {
    await mongo.connect();
    const result = await PracticeSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress' },
      { $set: { status: 'completed', completedAt: new Date() } }
    ).exec();
    return result.matchedCount;
  },
};
