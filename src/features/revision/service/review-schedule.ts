/**
 * Spaced repetition (T-022, pure). A skill is reviewed 1, 3, 7 and 14 days after it was learnt
 * (REVISION_INTERVALS_DAYS). A correct review moves it to the next date; a wrong one means it is not retained yet,
 * so the cycle starts again from that day. A late review keeps the gap to the next one instead of falling due again
 * at once.
 */
import { ReviewState } from '@/features/revision/types/revision.types';
import { REVISION_INTERVALS_DAYS } from '@/shared/const/course.const';
import { DAY_MS } from '@/shared/utils/date';

const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY_MS);

/** The schedule of a skill learnt on `today` (start of the UTC day). */
export const firstSchedule = (today: Date): ReviewState => ({ learnedAt: today, step: 0, nextReviewAt: addDays(today, REVISION_INTERVALS_DAYS[0]) });

export function afterReview(state: ReviewState, correct: boolean, today: Date): ReviewState {
  if (!correct) return firstSchedule(today);
  const step = state.step + 1;
  if (step >= REVISION_INTERVALS_DAYS.length) return { learnedAt: state.learnedAt, step, nextReviewAt: null };
  const planned = addDays(state.learnedAt, REVISION_INTERVALS_DAYS[step]);
  const gap = REVISION_INTERVALS_DAYS[step] - REVISION_INTERVALS_DAYS[step - 1];
  const earliest = addDays(today, gap);
  return { learnedAt: state.learnedAt, step, nextReviewAt: planned > earliest ? planned : earliest };
}

export const isDue = (state: { nextReviewAt?: Date | null }, today: Date) =>
  !!state.nextReviewAt && new Date(state.nextReviewAt).getTime() <= today.getTime();

/** Skills due for review on `today`, most overdue first. */
export function dueSkills(schedules: { skillCode: string; nextReviewAt?: Date | null }[], today: Date): string[] {
  return schedules
    .filter((s) => isDue(s, today))
    .sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime() || a.skillCode.localeCompare(b.skillCode))
    .map((s) => s.skillCode);
}
