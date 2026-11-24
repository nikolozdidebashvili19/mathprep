import { Types } from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/mongo', () => ({
  mongo: {
    connect: vi.fn(),
  },
}));

vi.mock('@/features/diagnostic/schema/diagnostic-session.schema', () => ({
  DiagnosticSessionModel: {
    updateOne: vi.fn(),
  },
}));

import { DiagnosticSessionModel } from '@/features/diagnostic/schema/diagnostic-session.schema';
import { mongo } from '@/shared/lib/mongo';

import { diagnosticSessionRepository } from './diagnostic-session.repository';

const mockModel = vi.mocked(DiagnosticSessionModel);
const SESSION_ID = '507f1f77bcf86cd799439011';
const QUESTION_ID = '507f1f77bcf86cd799439012';

describe('diagnosticSessionRepository.setAnswer', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replaces the answer atomically with a pipeline update that Mongoose 9 accepts', async () => {
    (mockModel.updateOne as ReturnType<typeof vi.fn>).mockReturnValueOnce({ exec: () => Promise.resolve({ matchedCount: 1 }) });

    const matched = await diagnosticSessionRepository.setAnswer(SESSION_ID, QUESTION_ID, 'ა');

    expect(mongo.connect).toHaveBeenCalled();
    const [filter, pipeline, options] = (mockModel.updateOne as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(filter).toEqual({ _id: SESSION_ID, status: 'in_progress' });
    expect(Array.isArray(pipeline)).toBe(true);
    // Without this Mongoose 9 throws "Cannot pass an array to query updates" and every answer fails to save.
    expect(options).toEqual({ updatePipeline: true });
    const appended = pipeline[0].$set.answers.$concatArrays[1][0];
    expect(appended.answer).toBe('ა');
    expect(appended.questionId).toBeInstanceOf(Types.ObjectId);
    expect(matched).toBe(1);
  });
});
