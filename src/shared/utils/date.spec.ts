import { describe, expect, it } from 'vitest';

import { courseDayIndex, startOfUtcDay } from '@/shared/utils/date';

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
