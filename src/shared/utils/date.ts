export const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of the given moment. Course days are counted in whole UTC days. */
export const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** 0-based day of a course on `now`, clamped to the course: before the start = day 0, after the end = last day. */
export function courseDayIndex(startDate: Date, now: Date, durationDays: number): number {
  const elapsed = Math.floor((startOfUtcDay(now).getTime() - startOfUtcDay(startDate).getTime()) / DAY_MS);
  return Math.min(Math.max(0, elapsed), durationDays - 1);
}
