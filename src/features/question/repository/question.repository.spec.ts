import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/mongo', () => ({
  mongo: {
    connect: vi.fn(),
  },
}));

vi.mock('@/features/question/schema/question.schema', () => ({
  QuestionModel: {
    find: vi.fn(),
    aggregate: vi.fn(),
    bulkWrite: vi.fn(),
  },
}));

import { QuestionModel } from '@/features/question/schema/question.schema';
import { mongo } from '@/shared/lib/mongo';

import { questionRepository } from './question.repository';

const mockMongo = vi.mocked(mongo);
const mockModel = vi.mocked(QuestionModel);

const EXAM_ID = '507f1f77bcf86cd799439011';

describe('questionRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('findByExamId connects, filters by exam and sorts by number', async () => {
    const questions = [{ code: '2026-V1-Q01', number: 1 }];
    const sort = vi.fn(() => ({ lean: () => ({ exec: () => Promise.resolve(questions) }) }));
    (mockModel.find as ReturnType<typeof vi.fn>).mockReturnValueOnce({ sort });

    const result = await questionRepository.findByExamId(EXAM_ID);

    expect(mockMongo.connect).toHaveBeenCalled();
    expect(mockModel.find).toHaveBeenCalledWith({ examId: EXAM_ID });
    expect(sort).toHaveBeenCalledWith({ number: 1 });
    expect(result).toEqual(questions);
  });

  it('countByStatus groups by status', async () => {
    const counts = [{ _id: 'draft', count: 210 }];
    (mockModel.aggregate as ReturnType<typeof vi.fn>).mockReturnValueOnce({ exec: () => Promise.resolve(counts) });

    const result = await questionRepository.countByStatus();

    expect(mockMongo.connect).toHaveBeenCalled();
    expect(mockModel.aggregate).toHaveBeenCalledWith([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    expect(result).toEqual(counts);
  });

  it('bulkUpsertByCode sends one unordered bulkWrite with $set / $setOnInsert per item', async () => {
    (mockModel.bulkWrite as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ upsertedCount: 1, matchedCount: 1 });

    const result = await questionRepository.bulkUpsertByCode([
      { code: 'A', always: { examId: EXAM_ID, number: 1 }, onInsert: { status: 'draft' } },
      { code: 'B', always: { number: 2 }, onInsert: {} },
    ]);

    expect(mockMongo.connect).toHaveBeenCalled();
    expect(mockModel.bulkWrite).toHaveBeenCalledTimes(1);
    const [ops, options] = (mockModel.bulkWrite as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options).toEqual({ ordered: false });
    expect(ops).toHaveLength(2);

    const first = ops[0].updateOne;
    expect(first.filter).toEqual({ code: 'A' });
    expect(first.upsert).toBe(true);
    expect(first.update.$set.number).toBe(1);
    expect(first.update.$set.examId).toBeInstanceOf(Types.ObjectId);
    expect(first.update.$set.examId.toString()).toBe(EXAM_ID);
    expect(first.update.$setOnInsert).toEqual({ code: 'A', status: 'draft' });

    const second = ops[1].updateOne;
    expect(second.update.$set).toEqual({ number: 2 });
    expect(second.update.$setOnInsert).toEqual({ code: 'B' });

    expect(result).toEqual({ inserted: 1, matched: 1 });
  });

  it('refreshDraftContentByCode only targets drafts and never upserts', async () => {
    (mockModel.bulkWrite as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ matchedCount: 1 });

    const matched = await questionRepository.refreshDraftContentByCode([{ code: 'A', fields: { text: 'x' } }]);

    const [ops] = (mockModel.bulkWrite as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
    expect(ops[0].updateOne).toEqual({ filter: { code: 'A', status: 'draft' }, update: { $set: { text: 'x' } } });
    expect(matched).toBe(1);
  });
});
