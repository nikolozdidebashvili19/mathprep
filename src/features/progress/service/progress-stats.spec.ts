import { describe, expect, it } from 'vitest';

import {
  activeDays,
  activeMinutes,
  bestStreak,
  currentStreak,
  itemXp,
  sessionXp,
  streakCalendar,
} from '@/features/progress/service/progress-stats';
import { ActivityItem, SessionActivity } from '@/features/progress/types/progress.types';
import { XP_RULES } from '@/shared/const/progress.const';

const q = (answeredAt: string | null, correct: boolean, hintsUsed = 0): ActivityItem => ({
  isQuestion: true,
  correct,
  hintsUsed,
  answeredAt: answeredAt ? new Date(answeredAt) : null,
});
const theory = (answeredAt: string): ActivityItem => ({ isQuestion: false, correct: true, hintsUsed: 0, answeredAt: new Date(answeredAt) });

describe('XP', () => {
  it('rewards correct answers, lowers them per hint, and still gives effort XP for wrong ones', () => {
    expect(itemXp(q('2026-11-20T10:00:00Z', true))).toBe(XP_RULES.correct);
    expect(itemXp(q('2026-11-20T10:00:00Z', true, 1))).toBe(XP_RULES.correct - XP_RULES.hintPenalty);
    expect(itemXp(q('2026-11-20T10:00:00Z', true, 10))).toBe(XP_RULES.minCorrect);
    expect(itemXp(q('2026-11-20T10:00:00Z', false))).toBe(XP_RULES.wrong);
    expect(itemXp(theory('2026-11-20T10:00:00Z'))).toBe(XP_RULES.theory);
    expect(itemXp(q(null, false))).toBe(0);
  });

  it('adds the day bonus only to a finished session', () => {
    const items = [theory('2026-11-20T10:00:00Z'), q('2026-11-20T10:02:00Z', true)];
    expect(sessionXp({ completedAt: null, items })).toBe(XP_RULES.theory + XP_RULES.correct);
    expect(sessionXp({ completedAt: new Date('2026-11-20T10:03:00Z'), items })).toBe(XP_RULES.theory + XP_RULES.correct + XP_RULES.dayBonus);
  });
});

describe('streaks', () => {
  const days = new Set(['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-22', '2026-11-23']);

  it('counts back from today, or from yesterday while today is still open', () => {
    expect(currentStreak(days, '2026-11-23')).toBe(2);
    expect(currentStreak(days, '2026-11-24')).toBe(2);
    expect(currentStreak(days, '2026-11-25')).toBe(0);
  });

  it('finds the longest run', () => {
    expect(bestStreak(days)).toBe(3);
    expect(bestStreak(new Set())).toBe(0);
  });

  it('puts late-evening answers on the Tbilisi day', () => {
    const sessions: SessionActivity[] = [{ completedAt: null, items: [q('2026-11-22T21:00:00Z', true)] }];
    expect([...activeDays(sessions)]).toEqual(['2026-11-23']);
  });
});

describe('time and history', () => {
  it('counts short gaps as study and long gaps as a break', () => {
    const t = (m: number) => new Date(Date.UTC(2026, 10, 20, 10, m));
    expect(activeMinutes([])).toBe(0);
    expect(activeMinutes([t(0)])).toBe(1);
    expect(activeMinutes([t(0), t(3), t(5), t(40)])).toBe(1 + 3 + 2 + 1);
  });

  it('builds a Monday-first calendar that ends with the current week', () => {
    const grid = streakCalendar(new Set(['2026-11-23']), '2026-11-24', 2);
    expect(grid).toHaveLength(2);
    expect(grid[1][0]).toEqual({ key: '2026-11-23', active: true, today: false, future: false });
    expect(grid[1][1].today).toBe(true);
    expect(grid[1][6].future).toBe(true);
    expect(grid[0][0].key).toBe('2026-11-16');
  });
});
