import { PracticeSessionDocument, PracticeSessionModel } from '@/features/course/schema/practice-session.schema';
import { BlockKind } from '@/features/course/types/course.types';
import { mongo } from '@/shared/lib/mongo';

type NewItem = { blockIndex: number; kind: BlockKind; skillCode: string | null; questionId: string | null };

export const practiceSessionRepository = {
  async findById(id: string): Promise<PracticeSessionDocument | null> {
    await mongo.connect();
    return PracticeSessionModel.findById(id).lean<PracticeSessionDocument>().exec();
  },

  async findByCourseDay(courseId: string, dayIndex: number): Promise<PracticeSessionDocument | null> {
    await mongo.connect();
    return PracticeSessionModel.findOne({ courseId, dayIndex }).lean<PracticeSessionDocument>().exec();
  },

  async create(input: { userId: string; courseId: string; dayIndex: number; items: NewItem[] }): Promise<PracticeSessionDocument> {
    await mongo.connect();
    const doc = await PracticeSessionModel.create({
      ...input,
      items: input.items.map((i) => ({ ...i, skillCode: i.skillCode ?? undefined, questionId: i.questionId ?? undefined })),
    });
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

  /** Reveals one more hint while the item is unanswered and hints remain (atomic; 0 = nothing changed). */
  async incrementHints(sessionId: string, itemIndex: number, max: number): Promise<number> {
    await mongo.connect();
    const path = `items.${itemIndex}`;
    const result = await PracticeSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress', [`${path}.answeredAt`]: { $exists: false }, [`${path}.hintsUsed`]: { $not: { $gte: max } } },
      { $inc: { [`${path}.hintsUsed`]: 1 } }
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
