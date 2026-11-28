import { describe, expect, it } from 'vitest';

import { afterReview, dueSkills, firstSchedule, isDue } from '@/features/revision/service/review-schedule';
import { DAY_MS } from '@/shared/utils/date';

const day = (n: number) => new Date(Date.UTC(2026, 10, 1) + n * DAY_MS);

describe('spaced repetition (1 / 3 / 7 / 14 days)', () => {
  it('reviews a skill 1, 3, 7 and 14 days after it was learnt, then it is retained', () => {
    let state = firstSchedule(day(0));
    expect(state.nextReviewAt).toEqual(day(1));
    state = afterReview(state, true, day(1));
    expect(state.nextReviewAt).toEqual(day(3));
    state = afterReview(state, true, day(3));
    expect(state.nextReviewAt).toEqual(day(7));
    state = afterReview(state, true, day(7));
    expect(state.nextReviewAt).toEqual(day(14));
    state = afterReview(state, true, day(14));
    expect(state).toMatchObject({ step: 4, nextReviewAt: null });
  });

  it('a wrong review starts the cycle again from that day', () => {
    const state = afterReview(afterReview(firstSchedule(day(0)), true, day(1)), false, day(3));
    expect(state).toEqual({ learnedAt: day(3), step: 0, nextReviewAt: day(4) });
  });

  it('a late review keeps the gap to the next one instead of falling due again at once', () => {
    // First review planned for day 1, done on day 10: the next comes 2 days later (the 1 → 3 gap), not on day 3.
    const state = afterReview(firstSchedule(day(0)), true, day(10));
    expect(state.nextReviewAt).toEqual(day(12));
  });

  it('lists due skills, most overdue first; future and finished schedules are not due', () => {
    const schedules = [
      { skillCode: 'B', nextReviewAt: day(4) },
      { skillCode: 'A', nextReviewAt: day(2) },
      { skillCode: 'C', nextReviewAt: day(9) },
      { skillCode: 'D', nextReviewAt: null },
    ];
    expect(dueSkills(schedules, day(5))).toEqual(['A', 'B']);
    expect(isDue({ nextReviewAt: day(5) }, day(5))).toBe(true);
  });
});
