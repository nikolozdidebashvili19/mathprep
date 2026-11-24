import { CalendarDay, ActivityItem, SessionActivity, WeekXp } from '@/features/progress/types/progress.types';
import { FIRST_ANSWER_MINUTES, MAX_ACTIVE_GAP_MINUTES, XP_RULES } from '@/shared/const/progress.const';
import { localDayKey, shiftDayKey, weekdayIndex } from '@/shared/utils/date';

/**
 * Pure progress maths (no DB): XP, streaks, active minutes and the calendar. Everything is derived from the
 * answer timestamps already stored on practice sessions, so there is no separate counter to drift out of sync.
 */

/** XP for an answered step: theory read, a correct answer (less per hint used) or a wrong one (effort). */
export function answerXp(item: Pick<ActivityItem, 'isQuestion' | 'correct' | 'hintsUsed'>): number {
  if (!item.isQuestion) return XP_RULES.theory;
  if (!item.correct) return XP_RULES.wrong;
  return Math.max(XP_RULES.minCorrect, XP_RULES.correct - XP_RULES.hintPenalty * item.hintsUsed);
}

/** XP for one step (0 while unanswered). */
export const itemXp = (item: ActivityItem) => (item.answeredAt ? answerXp(item) : 0);

/** XP of one session, including the bonus for finishing the day. */
export const sessionXp = (session: SessionActivity) =>
  session.items.reduce((sum, item) => sum + itemXp(item), 0) + (session.completedAt ? XP_RULES.dayBonus : 0);

/** Every XP gain with the local day it happened on. */
export function xpEvents(sessions: SessionActivity[]): { day: string; xp: number }[] {
  return sessions.flatMap((s) => [
    ...s.items.flatMap((i) => (i.answeredAt ? [{ day: localDayKey(i.answeredAt), xp: itemXp(i) }] : [])),
    ...(s.completedAt ? [{ day: localDayKey(s.completedAt), xp: XP_RULES.dayBonus }] : []),
  ]);
}

/** Local days with at least one answered step. */
export const activeDays = (sessions: SessionActivity[]) =>
  new Set(sessions.flatMap((s) => s.items.flatMap((i) => (i.answeredAt ? [localDayKey(i.answeredAt)] : []))));

/**
 * Consecutive active days ending today. If today has no activity yet the streak is still alive from yesterday
 * (the student has until midnight to keep it).
 */
export function currentStreak(days: Set<string>, todayKey: string): number {
  let key = days.has(todayKey) ? todayKey : shiftDayKey(todayKey, 1);
  let count = 0;
  while (days.has(key)) {
    count += 1;
    key = shiftDayKey(key, 1);
  }
  return count;
}

export function bestStreak(days: Set<string>): number {
  let best = 0;
  for (const key of days) {
    if (days.has(shiftDayKey(key, 1))) continue; // not the start of a run
    let length = 0;
    let k = key;
    while (days.has(k)) {
      length += 1;
      k = shiftDayKey(k, -1);
    }
    best = Math.max(best, length);
  }
  return best;
}

/** Estimated study minutes from answer times: gaps up to MAX_ACTIVE_GAP_MINUTES count, longer ones are breaks. */
export function activeMinutes(timestamps: Date[]): number {
  const sorted = timestamps.map((t) => t.getTime()).sort((a, b) => a - b);
  let minutes = 0;
  sorted.forEach((t, i) => {
    const gap = i === 0 ? Infinity : (t - sorted[i - 1]) / 60_000;
    minutes += gap <= MAX_ACTIVE_GAP_MINUTES ? gap : FIRST_ANSWER_MINUTES;
  });
  return Math.round(minutes);
}

/** Minutes studied on one local day. */
export const minutesOn = (sessions: SessionActivity[], dayKey: string) =>
  activeMinutes(sessions.flatMap((s) => s.items.flatMap((i) => (i.answeredAt && localDayKey(i.answeredAt) === dayKey ? [i.answeredAt] : []))));

/** Monday of the week that contains the day. */
const weekStart = (key: string) => shiftDayKey(key, weekdayIndex(key));

/** XP per Monday-to-Sunday week, oldest first, ending with the current week. */
export function weeklyXp(events: { day: string; xp: number }[], todayKey: string, weeks: number): WeekXp[] {
  const thisWeek = weekStart(todayKey);
  const totals = Array.from({ length: weeks }, (_, i) => ({ weeksAgo: weeks - 1 - i, xp: 0 }));
  for (const e of events) {
    const weeksAgo = Math.round((Date.parse(thisWeek) - Date.parse(weekStart(e.day))) / (7 * 24 * 60 * 60 * 1000));
    if (weeksAgo >= 0 && weeksAgo < weeks) totals[weeks - 1 - weeksAgo].xp += e.xp;
  }
  return totals;
}

/** Calendar grid of the last `weeks` weeks (Monday first), the current week last. */
export function streakCalendar(days: Set<string>, todayKey: string, weeks: number): CalendarDay[][] {
  const first = shiftDayKey(weekStart(todayKey), 7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = shiftDayKey(first, -(w * 7 + d));
      return { key, active: days.has(key), today: key === todayKey, future: key > todayKey };
    })
  );
}
