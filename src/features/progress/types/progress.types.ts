/** One answered (or unanswered) step of a practice session, as far as XP and streaks care. */
export type ActivityItem = {
  isQuestion: boolean;
  correct: boolean | null;
  hintsUsed: number;
  answeredAt: Date | null;
};

export type SessionActivity = {
  completedAt: Date | null;
  items: ActivityItem[];
};

export type CalendarDay = { key: string; active: boolean; today: boolean; future: boolean };

export type SkillProgress = { code: string; nameKa: string; value: number; observations: number };

export type ProgressView = {
  streakDays: number;
  bestStreak: number;
  activeToday: boolean;
  xp: number;
  /** The current week, Monday to Sunday. */
  week: CalendarDay[];
  course: { daysCompleted: number; durationDays: number; todayIndex: number } | null;
  skills: SkillProgress[];
};
