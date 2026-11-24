import { describe, expect, it } from 'vitest';

import { courseDayIndex, localDayKey, shiftDayKey, startOfUtcDay, weekdayIndex } from '@/shared/utils/date';

describe('date utils', () => {
  it('truncates to midnight UTC', () => {
    expect(startOfUtcDay(new Date('2026-11-22T23:59:00Z')).toISOString()).toBe('2026-11-22T00:00:00.000Z');
  });

  it('counts whole course days and clamps to the course', () => {
    const start = new Date('2026-11-20T00:00:00Z');
    expect(courseDayIndex(start, new Date('2026-11-20T18:00:00Z'), 30)).toBe(0);
    expect(courseDayIndex(start, new Date('2026-11-22T01:00:00Z'), 30)).toBe(2);
    expect(courseDayIndex(start, new Date('2026-11-01T00:00:00Z'), 30)).toBe(0);
    expect(courseDayIndex(start, new Date('2027-03-01T00:00:00Z'), 30)).toBe(29);
  });
});

describe('local day keys', () => {
  it('uses Tbilisi time (UTC+4) for the day boundary', () => {
    expect(localDayKey(new Date('2026-11-22T19:59:00Z'))).toBe('2026-11-22');
    expect(localDayKey(new Date('2026-11-22T20:00:00Z'))).toBe('2026-11-23');
  });

  it('shifts keys across months and finds the weekday', () => {
    expect(shiftDayKey('2026-12-01', 1)).toBe('2026-11-30');
    expect(shiftDayKey('2026-11-30', -1)).toBe('2026-12-01');
    expect(weekdayIndex('2026-11-23')).toBe(0); // Monday
    expect(weekdayIndex('2026-11-29')).toBe(6); // Sunday
  });
});
