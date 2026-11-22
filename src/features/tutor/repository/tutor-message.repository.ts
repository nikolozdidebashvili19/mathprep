import { TutorMessageModel } from '@/features/tutor/schema/tutor-message.schema';
import { mongo } from '@/shared/lib/mongo';

type NewTutorMessage = {
  userId: string;
  questionId: string;
  sessionId: string;
  message: string;
  normalized: string;
  reply: string;
  cached: boolean;
  provider?: string;
  model?: string;
};

export const tutorMessageRepository = {
  /** Model calls since `since` (cached replies are free and not counted). */
  async countModelCallsSince(userId: string, since: Date): Promise<number> {
    await mongo.connect();
    return TutorMessageModel.countDocuments({ userId, cached: false, createdAt: { $gte: since } }).exec();
  },

  async findReply(questionId: string, normalized: string): Promise<string | null> {
    await mongo.connect();
    const doc = await TutorMessageModel.findOne({ questionId, normalized, cached: false }, { reply: 1 }).lean<{ reply: string }>().exec();
    return doc?.reply ?? null;
  },

  async create(message: NewTutorMessage): Promise<void> {
    await mongo.connect();
    await TutorMessageModel.create(message);
  },
};
