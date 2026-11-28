import { Types } from 'mongoose';

import { ReviewScheduleDocument, ReviewScheduleModel } from '@/features/revision/schema/review-schedule.schema';
import { ReviewState } from '@/features/revision/types/revision.types';
import { mongo } from '@/shared/lib/mongo';

export const reviewScheduleRepository = {
  async findByUser(userId: string): Promise<ReviewScheduleDocument[]> {
    await mongo.connect();
    return ReviewScheduleModel.find({ userId }).lean<ReviewScheduleDocument[]>().exec();
  },

  async findOne(userId: string, skillCode: string): Promise<ReviewScheduleDocument | null> {
    await mongo.connect();
    return ReviewScheduleModel.findOne({ userId, skillCode }).lean<ReviewScheduleDocument>().exec();
  },

  /** Starts a skill's schedule the first time it is practised; later calls change nothing (1 = created). */
  async insertIfMissing(userId: string, skillCode: string, state: ReviewState): Promise<number> {
    await mongo.connect();
    const owner = new Types.ObjectId(userId);
    const result = await ReviewScheduleModel.updateOne(
      { userId: owner, skillCode },
      { $setOnInsert: { userId: owner, skillCode, ...state } },
      { upsert: true }
    ).exec();
    return result.upsertedCount;
  },

  async update(userId: string, skillCode: string, state: ReviewState & { lastReviewedAt: Date }): Promise<number> {
    await mongo.connect();
    const result = await ReviewScheduleModel.updateOne({ userId: new Types.ObjectId(userId), skillCode }, { $set: state }).exec();
    return result.matchedCount;
  },
};
