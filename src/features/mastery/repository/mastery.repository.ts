import { Types } from 'mongoose';

import { MasteryDocument, MasteryModel } from '@/features/mastery/schema/mastery.schema';
import { MasteryState } from '@/features/mastery/types/mastery.types';
import { mongo } from '@/shared/lib/mongo';

export const masteryRepository = {
  async findByUser(userId: string): Promise<MasteryDocument[]> {
    await mongo.connect();
    return MasteryModel.find({ userId }).lean<MasteryDocument[]>().exec();
  },

  /** Replaces the student's mastery with a freshly computed set (the model rebuilds from all evidence). */
  async replaceForUser(userId: string, states: MasteryState[]): Promise<number> {
    await mongo.connect();
    const owner = new Types.ObjectId(userId);
    await MasteryModel.deleteMany({ userId: owner }).exec();
    const docs = await MasteryModel.insertMany(states.map((s) => ({ ...s, userId: owner })));
    return docs.length;
  },

  /** Saves one skill's state after an incremental update (practice answer). */
  async upsertOne(userId: string, state: MasteryState): Promise<void> {
    await mongo.connect();
    const owner = new Types.ObjectId(userId);
    await MasteryModel.updateOne({ userId: owner, skillCode: state.skillCode }, { $set: { ...state, userId: owner } }, { upsert: true }).exec();
  },
};
