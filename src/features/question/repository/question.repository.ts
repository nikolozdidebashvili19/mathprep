import { Types } from 'mongoose';

import { QuestionDocument, QuestionModel } from '@/features/question/schema/question.schema';
import { mongo } from '@/shared/lib/mongo';

// Write-side shape: plain arrays and a string exam id (Mongoose infers subdocument arrays as DocumentArray).
type QuestionFields = Partial<Omit<QuestionDocument, '_id' | 'createdAt' | 'updatedAt' | 'examId' | 'options' | 'skills'>> & {
  examId?: string;
  options?: { key: string; text: string }[];
  skills?: { skillCode: string; isPrimary: boolean }[];
};

export const questionRepository = {
  async findByExamId(examId: string): Promise<QuestionDocument[]> {
    await mongo.connect();
    return QuestionModel.find({ examId }).sort({ number: 1 }).lean<QuestionDocument[]>().exec();
  },

  async findByExamIdAndTypes(examId: string, types: readonly string[]): Promise<QuestionDocument[]> {
    await mongo.connect();
    return QuestionModel.find({ examId, type: { $in: types } }).sort({ number: 1 }).lean<QuestionDocument[]>().exec();
  },

  async findByIds(ids: string[]): Promise<QuestionDocument[]> {
    await mongo.connect();
    return QuestionModel.find({ _id: { $in: ids } }).lean<QuestionDocument[]>().exec();
  },

  /** Quick-check pool: tagged multiple-choice questions on the program, outside the exams reserved for the full mock. */
  async findQuickCheckPool(excludeExamIds: string[]): Promise<QuestionDocument[]> {
    await mongo.connect();
    return QuestionModel.find({
      type: 'multiple_choice',
      offProgram: { $ne: true },
      primarySkill: { $exists: true, $ne: null },
      examId: { $nin: excludeExamIds },
    })
      .lean<QuestionDocument[]>()
      .exec();
  },

  async countByStatus(): Promise<{ _id: string; count: number }[]> {
    await mongo.connect();
    return QuestionModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec();
  },

  /**
   * `always` fields are refreshed on every run; `onInsert` fields are written only when the question is new,
   * so edits made during admin review (text, options, answer, status, …) survive a re-seed.
   */
  async bulkUpsertByCode(
    items: { code: string; always: QuestionFields; onInsert: QuestionFields }[]
  ): Promise<{ inserted: number; matched: number }> {
    await mongo.connect();
    const result = await QuestionModel.bulkWrite(
      items.map(({ code, always, onInsert }) => ({
        updateOne: {
          filter: { code },
          update: {
            $set: { ...always, ...(always.examId ? { examId: new Types.ObjectId(always.examId) } : {}) },
            $setOnInsert: { code, ...onInsert },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    return { inserted: result.upsertedCount, matched: result.matchedCount };
  },

  /** Overwrites content fields only on questions still in `draft`; reviewed questions never match. */
  async refreshDraftContentByCode(items: { code: string; fields: QuestionFields }[]): Promise<number> {
    await mongo.connect();
    const result = await QuestionModel.bulkWrite(
      items.map(({ code, fields }) => ({
        updateOne: { filter: { code, status: 'draft' }, update: { $set: fields } },
      })),
      { ordered: false }
    );
    return result.matchedCount;
  },
};
