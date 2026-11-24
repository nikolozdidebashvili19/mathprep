/** Georgia is UTC+4 all year (no daylight saving), so a student's "day" for streaks starts at 00:00 Tbilisi time. */
export const LOCAL_UTC_OFFSET_HOURS = 4;

/** XP rules: effort counts (a wrong answer still earns a little), hints lower a correct answer's reward. */
export const XP_RULES = {
  correct: 10,
  wrong: 2,
  hintPenalty: 2,
  minCorrect: 4,
  theory: 5,
  dayBonus: 20,
};

/** Active time is estimated from answer timestamps: gaps longer than this count as a break, not study. */
export const MAX_ACTIVE_GAP_MINUTES = 5;
/** Time credited for the first answer of a stretch (reading the question before answering). */
export const FIRST_ANSWER_MINUTES = 1;

export const DEFAULT_DAILY_GOAL_MINUTES = 30;
export const STREAK_CALENDAR_WEEKS = 5;
export const XP_HISTORY_WEEKS = 6;
export const PROGRESS_BAR_SEGMENTS = 10;
export const COURSE_BAR_SEGMENTS = 20;

export const WEEKDAY_SHORT = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

export const PROGRESS_COPY = {
  title: 'პროგრესი',
  subtitle: 'ყოველი ამოხსნილი ამოცანა აქ აისახება.',
  streakTitle: 'დღე ზედიზედ',
  bestStreak: 'რეკორდი',
  totalXp: 'XP სულ',
  todayXp: 'დღეს',
  calendarTitle: 'აქტიური დღეები',
  calendarHint: 'ცეცხლი = იმ დღეს ივარჯიშე',
  weeklyXpTitle: 'XP კვირების მიხედვით',
  thisWeek: 'ეს კვირა',
  weeksAgo: (n: number) => `${n} კვირის წინ`,
  courseTitle: 'კურსის პროგრესი',
  courseDays: (done: number, total: number) => `${done} / ${total} დღე დასრულებულია`,
  noCourse: 'კურსი ჯერ არ გაქვს. აწყობის შემდეგ აქ გამოჩნდება.',
  masteryTitle: 'უნარების დაუფლება',
  masteryEmpty: 'დიაგნოსტიკის ან ვარჯიშის შემდეგ აქ გამოჩნდება შენი უნარები.',
  answered: 'ამოხსნილი ამოცანა',
  accuracy: 'სიზუსტე',
  startToday: 'დღევანდელი ვარჯიში',
  streakAlive: 'დღეს ივარჯიშე, სერია გრძელდება!',
  streakAtRisk: 'დღეს ჯერ არ გივარჯიშია. ერთი ამოცანაც კი ინარჩუნებს სერიას.',
  streakZero: 'დაიწყე დღეს და პირველი ცეცხლი აანთე.',
};
