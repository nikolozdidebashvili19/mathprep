import { Types } from 'mongoose';

import { AttemptDocument, AttemptModel } from '@/features/attempt/schema/attempt.schema';
import { mongo } from '@/shared/lib/mongo';

// Write-side shape: ids as strings (Mongoose casts them).
export type NewAttempt = Omit<AttemptDocument, '_id' | 'createdAt' | 'updatedAt' | 'userId' | 'questionId' | 'contextId' | 'hintsUsed'> & {
  userId: string;
  questionId: string;
  contextId?: string;
  /** Defaults to 0 (diagnostics never offer hints). */
  hintsUsed?: number;
};

type PracticeAttemptRow = { questionId: Types.ObjectId; points: number; maxPoints: number; hintsUsed?: number; createdAt: Date };

export type AttemptHistoryRow = { questionId: Types.ObjectId; answer?: string; points: number; maxPoints: number; createdAt: Date };

export const attemptRepository = {
  async insertMany(attempts: NewAttempt[]): Promise<number> {
    await mongo.connect();
    const docs = await AttemptModel.insertMany(attempts);
    return docs.length;
  },

  /** The student's answered questions (for "seen" / "answered wrong" when picking practice). */
  async findOutcomesByUser(userId: string): Promise<{ questionId: Types.ObjectId; points: number; maxPoints: number }[]> {
    await mongo.connect();
    return AttemptModel.find({ userId }, { questionId: 1, points: 1, maxPoints: 1 })
      .lean<{ questionId: Types.ObjectId; points: number; maxPoints: number }[]>()
      .exec();
  },

  /** Every answer of the student (any context), oldest first: the source of the saved-mistakes list. */
  async findHistoryByUser(userId: string): Promise<AttemptHistoryRow[]> {
    await mongo.connect();
    return AttemptModel.find({ userId }, { questionId: 1, answer: 1, points: 1, maxPoints: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean<AttemptHistoryRow[]>()
      .exec();
  },

  /** Practice answers in time order (the mastery rebuild replays them after/among diagnostics). */
  async findPracticeByUser(userId: string): Promise<PracticeAttemptRow[]> {
    await mongo.connect();
    return AttemptModel.find({ userId, context: 'practice' }, { questionId: 1, points: 1, maxPoints: 1, hintsUsed: 1, createdAt: 1 })
      .sort({ createdAt: 1 })
      .lean<PracticeAttemptRow[]>()
      .exec();
  },
};
