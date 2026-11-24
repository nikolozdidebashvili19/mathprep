import { LOCAL_UTC_OFFSET_HOURS } from '@/shared/const/progress.const';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of the given moment. Course days are counted in whole UTC days. */
export const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** 0-based day of a course on `now`, clamped to the course: before the start = day 0, after the end = last day. */
export function courseDayIndex(startDate: Date, now: Date, durationDays: number): number {
  const elapsed = Math.floor((startOfUtcDay(now).getTime() - startOfUtcDay(startDate).getTime()) / DAY_MS);
  return Math.min(Math.max(0, elapsed), durationDays - 1);
}

/** The student's local calendar day as 'YYYY-MM-DD' (Georgia, UTC+4, no daylight saving). Streaks count these. */
export function localDayKey(d: Date, offsetHours = LOCAL_UTC_OFFSET_HOURS): string {
  return new Date(d.getTime() + offsetHours * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The day key `days` before (or after, if negative) the given key. */
export function shiftDayKey(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday for a day key. */
export const weekdayIndex = (key: string) => (new Date(`${key}T00:00:00Z`).getUTCDay() + 6) % 7;
