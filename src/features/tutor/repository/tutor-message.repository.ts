import { TutorMessageModel } from '@/features/tutor/schema/tutor-message.schema';
import { TUTOR_MODES } from '@/shared/const/tutor.const';
import { mongo } from '@/shared/lib/mongo';

type TutorMode = (typeof TUTOR_MODES)[number];

type NewTutorMessage = {
  userId: string;
  questionId: string;
  sessionId: string;
  message: string;
  normalized: string;
  mode: TutorMode;
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

  /** Cached reply for the same first message on the same question, in the same mode (older rows are "explain"). */
  async findReply(questionId: string, normalized: string, mode: TutorMode): Promise<string | null> {
    await mongo.connect();
    const modeFilter = mode === 'explain' ? { $in: ['explain', null] } : mode;
    const doc = await TutorMessageModel.findOne({ questionId, normalized, cached: false, mode: modeFilter }, { reply: 1 })
      .lean<{ reply: string }>()
      .exec();
    return doc?.reply ?? null;
  },

  async create(message: NewTutorMessage): Promise<void> {
    await mongo.connect();
    await TutorMessageModel.create(message);
  },
};
