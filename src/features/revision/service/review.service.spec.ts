import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/revision/repository/review-schedule.repository', () => ({
  reviewScheduleRepository: { findByUser: vi.fn(), findOne: vi.fn(), insertIfMissing: vi.fn(), update: vi.fn() },
}));

import { reviewScheduleRepository } from '@/features/revision/repository/review-schedule.repository';
import { ReviewScheduleDocument } from '@/features/revision/schema/review-schedule.schema';
import { recordLearningService, recordReviewAnswerService, reviewOverviewService } from '@/features/revision/service/review.service';
import { DAY_MS } from '@/shared/utils/date';

const USER = new Types.ObjectId().toString();
const NOW = new Date(Date.UTC(2026, 10, 10, 15));
const TODAY = new Date(Date.UTC(2026, 10, 10));
const repo = vi.mocked(reviewScheduleRepository);
const schedule = (skillCode: string, learnedDaysAgo: number, step: number, nextInDays: number | null) =>
  ({
    skillCode,
    learnedAt: new Date(TODAY.getTime() - learnedDaysAgo * DAY_MS),
    step,
    nextReviewAt: nextInDays === null ? null : new Date(TODAY.getTime() + nextInDays * DAY_MS),
  }) as ReviewScheduleDocument;

beforeEach(() => vi.clearAllMocks());

describe('review service', () => {
  it('the first practice answer starts the schedule (review tomorrow); later ones change nothing', async () => {
    await recordLearningService(USER, 'A4', NOW);
    expect(repo.insertIfMissing).toHaveBeenCalledWith(USER, 'A4', { learnedAt: TODAY, step: 0, nextReviewAt: new Date(TODAY.getTime() + DAY_MS) });
  });

  it('a due review moves on when correct; a skill that is not due is left alone', async () => {
    repo.findOne.mockResolvedValue(schedule('A4', 1, 0, 0));
    expect(await recordReviewAnswerService(USER, 'A4', true, NOW)).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(USER, 'A4', expect.objectContaining({ step: 1, nextReviewAt: new Date(TODAY.getTime() + 2 * DAY_MS) }));

    repo.findOne.mockResolvedValue(schedule('A4', 1, 1, 2));
    expect(await recordReviewAnswerService(USER, 'A4', false, NOW)).toBe(false);
    expect(repo.update).toHaveBeenCalledTimes(1);
  });

  it('lists what is due and what was learnt (newest first)', async () => {
    repo.findByUser.mockResolvedValue([schedule('N1', 9, 2, -2), schedule('A4', 1, 0, 0), schedule('G1', 3, 1, 4)]);
    expect(await reviewOverviewService(USER, NOW)).toEqual({ due: ['N1', 'A4'], learnt: ['A4', 'G1', 'N1'] });
  });
});
