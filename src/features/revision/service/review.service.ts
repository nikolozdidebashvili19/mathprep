import { reviewScheduleRepository } from '@/features/revision/repository/review-schedule.repository';
import { afterReview, dueSkills, firstSchedule, isDue } from '@/features/revision/service/review-schedule';
import { startOfUtcDay } from '@/shared/utils/date';

/** A practice answer on a skill: its review schedule starts the first time (later answers change nothing). */
export async function recordLearningService(userId: string, skillCode: string, now = new Date()): Promise<void> {
  await reviewScheduleRepository.insertIfMissing(userId, skillCode, firstSchedule(startOfUtcDay(now)));
}

/**
 * A review answer: when the skill is due, a correct answer moves it to the next interval and a wrong one starts the
 * cycle again from today. Returns whether the schedule moved (false = the skill was not due, nothing changed).
 */
export async function recordReviewAnswerService(userId: string, skillCode: string, correct: boolean, now = new Date()): Promise<boolean> {
  const today = startOfUtcDay(now);
  const schedule = await reviewScheduleRepository.findOne(userId, skillCode);
  if (!schedule || !isDue(schedule, today)) return false;
  const next = afterReview({ learnedAt: schedule.learnedAt, step: schedule.step, nextReviewAt: schedule.nextReviewAt ?? null }, correct, today);
  await reviewScheduleRepository.update(userId, skillCode, { ...next, lastReviewedAt: now });
  return true;
}

/** What the student has learnt and what is due today (most overdue first), for building a day. */
export async function reviewOverviewService(userId: string, now = new Date()): Promise<{ due: string[]; learnt: string[] }> {
  const schedules = await reviewScheduleRepository.findByUser(userId);
  const learnt = [...schedules].sort((a, b) => new Date(b.learnedAt).getTime() - new Date(a.learnedAt).getTime()).map((s) => s.skillCode);
  return { due: dueSkills(schedules, startOfUtcDay(now)), learnt };
}
