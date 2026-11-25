import { SkillDocument, SkillModel } from '@/features/skill/schema/skill.schema';
import { LessonType } from '@/features/skill/validations/lesson.validation';
import { TheoryCardType } from '@/features/skill/validations/theory.validation';
import { mongo } from '@/shared/lib/mongo';

type SkillFields = Omit<SkillDocument, '_id' | 'createdAt' | 'updatedAt'>;

export const skillRepository = {
  async findAll(): Promise<SkillDocument[]> {
    await mongo.connect();
    return SkillModel.find({}).sort({ code: 1 }).lean<SkillDocument[]>().exec();
  },

  async upsertByCode(data: SkillFields): Promise<string> {
    await mongo.connect();
    const doc = await SkillModel.findOneAndUpdate({ code: data.code }, { $set: data }, { upsert: true, returnDocument: 'after' }).exec();
    return doc._id.toString();
  },

  async setLesson(code: string, lesson: Omit<LessonType, 'code'>): Promise<number> {
    await mongo.connect();
    const result = await SkillModel.updateOne({ code }, { $set: { lesson } }).exec();
    return result.matchedCount;
  },

  async setTheoryCard(code: string, card: Omit<TheoryCardType, 'code'>): Promise<number> {
    await mongo.connect();
    const result = await SkillModel.updateOne({ code }, { $set: { theoryCard: card } }).exec();
    return result.matchedCount;
  },
};
