import { courseDayRepository } from '@/features/course/repository/course-day.repository';
import { courseRepository } from '@/features/course/repository/course.repository';
import { practiceSessionRepository } from '@/features/course/repository/practice-session.repository';
import { PracticeSessionDocument } from '@/features/course/schema/practice-session.schema';
import { masteryRepository } from '@/features/mastery/repository/mastery.repository';
import {
  activeDays,
  bestStreak,
  currentStreak,
  minutesOn,
  streakCalendar,
  weeklyXp,
  xpEvents,
} from '@/features/progress/service/progress-stats';
import { ProgressView, SessionActivity, SkillProgress } from '@/features/progress/types/progress.types';
import { skillRepository } from '@/features/skill/repository/skill.repository';
import { LearningStats } from '@/shared/const/dashboard.const';
import { DEFAULT_DAILY_GOAL_MINUTES, STREAK_CALENDAR_WEEKS, XP_HISTORY_WEEKS } from '@/shared/const/progress.const';
import { courseDayIndex, localDayKey } from '@/shared/utils/date';

export const toActivity = (s: PracticeSessionDocument): SessionActivity => ({
  completedAt: s.completedAt ?? null,
  items: s.items.map((i) => ({
    isQuestion: !!i.questionId,
    correct: i.correct ?? null,
    hintsUsed: i.hintsUsed ?? 0,
    answeredAt: i.answeredAt ?? null,
  })),
});

/** Streak, XP and today's minutes for the dashboard pills and daily-goal card. */
export async function getLearningStatsService(userId: string, now = new Date()): Promise<LearningStats> {
  const [sessions, course] = await Promise.all([practiceSessionRepository.findByUser(userId), courseRepository.findActiveByUser(userId)]);
  const activity = sessions.map(toActivity);
  const today = localDayKey(now);
  return {
    streakDays: currentStreak(activeDays(activity), today),
    xp: xpEvents(activity).reduce((sum, e) => sum + e.xp, 0),
    minutesToday: minutesOn(activity, today),
    dailyGoalMinutes: course?.minutesPerDay ?? DEFAULT_DAILY_GOAL_MINUTES,
  };
}

/** Everything the progress page shows (T-024): streak calendar, weekly XP, course completion, skill mastery. */
export async function getProgressService(userId: string, now = new Date()): Promise<ProgressView> {
  const [sessions, course, mastery, skills] = await Promise.all([
    practiceSessionRepository.findByUser(userId),
    courseRepository.findActiveByUser(userId),
    masteryRepository.findByUser(userId),
    skillRepository.findAll(),
  ]);
  const activity = sessions.map(toActivity);
  const today = localDayKey(now);
  const days = activeDays(activity);
  const events = xpEvents(activity);
  const questions = activity.flatMap((s) => s.items.filter((i) => i.isQuestion && i.answeredAt));

  const courseView = course
    ? {
      daysCompleted: await courseDayRepository.countCompleted(course._id.toString()),
      durationDays: course.durationDays,
      todayIndex: courseDayIndex(new Date(course.startDate), now, course.durationDays),
    }
    : null;

  // The course's skills in teaching order, then any other skill the student has evidence on.
  const nameOf = new Map(skills.map((s) => [s.code, s.nameKa]));
  const masteryOf = new Map(mastery.map((m) => [m.skillCode, m]));
  const courseSkills = course?.skills ?? [];
  const others = mastery.filter((m) => m.observations > 0 && !courseSkills.includes(m.skillCode)).map((m) => m.skillCode);
  const skillRows: SkillProgress[] = [...courseSkills, ...others].map((code) => ({
    code,
    nameKa: nameOf.get(code) ?? code,
    value: masteryOf.get(code)?.value ?? 0,
    observations: masteryOf.get(code)?.observations ?? 0,
  }));

  return {
    streakDays: currentStreak(days, today),
    bestStreak: bestStreak(days),
    activeToday: days.has(today),
    xp: events.reduce((sum, e) => sum + e.xp, 0),
    xpToday: events.filter((e) => e.day === today).reduce((sum, e) => sum + e.xp, 0),
    minutesToday: minutesOn(activity, today),
    dailyGoalMinutes: course?.minutesPerDay ?? DEFAULT_DAILY_GOAL_MINUTES,
    answeredCount: questions.length,
    correctCount: questions.filter((i) => i.correct).length,
    calendar: streakCalendar(days, today, STREAK_CALENDAR_WEEKS),
    weeklyXp: weeklyXp(events, today, XP_HISTORY_WEEKS),
    course: courseView,
    skills: skillRows,
  };
}
