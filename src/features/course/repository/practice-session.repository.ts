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

  /** All of a student's sessions (any course), oldest first: the source for XP, streaks and learnt theory. */
  async findByUser(userId: string): Promise<PracticeSessionDocument[]> {
    await mongo.connect();
    return PracticeSessionModel.find({ userId }).sort({ createdAt: 1 }).lean<PracticeSessionDocument[]>().exec();
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

  /**
   * Reveals the next "I'm stuck" rung while the item is unanswered and rungs remain (atomic; 0 = nothing changed).
   * `hintCost` real hints are added for it (0 for teaching rungs).
   */
  async revealGuideStep(sessionId: string, itemIndex: number, expectedRevealed: number, hintCost: number): Promise<number> {
    await mongo.connect();
    const path = `items.${itemIndex}`;
    const revealed = expectedRevealed === 0 ? { $in: [0, null] } : expectedRevealed;
    const result = await PracticeSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress', [`${path}.answeredAt`]: { $exists: false }, [`${path}.guideStepsUsed`]: revealed },
      { $set: { [`${path}.guideStepsUsed`]: expectedRevealed + 1 }, $inc: { [`${path}.hintsUsed`]: hintCost } }
    ).exec();
    return result.matchedCount;
  },

  /** Inserts a second-chance question right after the item just answered (only while the session runs). */
  async insertItem(sessionId: string, position: number, item: NewItem & { secondChance: boolean }): Promise<number> {
    await mongo.connect();
    const result = await PracticeSessionModel.updateOne(
      { _id: sessionId, status: 'in_progress' },
      { $push: { items: { $each: [{ ...item, skillCode: item.skillCode ?? undefined, questionId: item.questionId ?? undefined }], $position: position } } }
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
