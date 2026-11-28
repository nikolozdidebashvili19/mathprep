export const STUDENT_GRADES = [11, 12] as const;

export const LOCALES = ['ka'] as const;

export const QUESTION_TYPES = ['multiple_choice', 'numeric', 'written'] as const;

export const QUESTION_SOURCES = ['naec', 'template', 'ai_variant'] as const;

export const CONTENT_STATUSES = ['draft', 'approved', 'rejected'] as const;

export const MISTAKE_TYPES = ['conceptual', 'calculation', 'misread', 'incomplete'] as const;

export const MASTERY_STAGES = [
  'foundation',
  'basic',
  'independent',
  'exam',
  'advanced',
  'retention',
] as const;

export const ATTEMPT_CONTEXTS = ['diagnostic', 'practice', 'weekly_check', 'final_mock'] as const;

export const GRADING_STATUSES = ['pending', 'graded', 'needs_review'] as const;

export const DIAGNOSTIC_STATUSES = ['in_progress', 'completed'] as const;

/** Question types graded instantly by code (T-013). Written answers need photo grading (T-014/T-015). */
export const AUTO_GRADED_TYPES = ['multiple_choice', 'numeric'] as const;

/** Relative tolerance when comparing numeric answers (T-013). */
export const NUMERIC_TOLERANCE = 1e-6;

export const COURSE_STATUSES = ['active', 'completed', 'abandoned'] as const;

export const PRACTICE_SESSION_STATUSES = ['in_progress', 'completed'] as const;

export const COURSE_DURATION_MONTHS = [1, 3, 5] as const;

export const DAILY_MINUTES_OPTIONS = [30, 60, 90, 120] as const;

/** `check` = weekly check day, `mock` = final mock exam (both come out of the 15% reserve). */
export const SESSION_BLOCK_KINDS = ['theory', 'practice', 'drill', 'revision', 'check', 'mock'] as const;

export const MIN_DIFFICULTY = 1;

export const MAX_DIFFICULTY = 5;

/** `full` = a whole past exam ("full mock"); `quick` = the adaptive quick check with handwriting photos. */
export const DIAGNOSTIC_KINDS = ['full', 'quick'] as const;

/** Questions in the quick check: one per topic (12 topics), within the 10–15 range agreed with the product owner. */
export const QUICK_CHECK_LENGTH = 12;

/** Ability estimate on the 1–5 difficulty scale: start just below the middle, move by a fixed step per answer. */
export const QUICK_CHECK_START_ABILITY = 2.5;
export const QUICK_CHECK_ABILITY_STEP = 0.75;

/** Handwriting photo analysis lifecycle (vision model, after upload). */
export const ANALYSIS_STATUSES = ['pending', 'done', 'failed'] as const;

/** Upper bound for one uploaded work photo; the browser compresses to well below this. */
export const MAX_WORK_PHOTO_BYTES = 2 * 1024 * 1024;

export const WORK_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Where a work photo was taken, and (practice) why: stuck before answering, or finding the mistake after. */
export const WORK_PHOTO_CONTEXTS = ['diagnostic', 'practice'] as const;
export const PRACTICE_PHOTO_MODES = ['stuck', 'mistake'] as const;
/** What a practice photo shows: a wrong step, working that stopped, or correct working so far. */
export const PHOTO_PROGRESS = ['mistake', 'stopped', 'on_track'] as const;

/** Knowledge-map level of a skill from its quick-check evidence score (−1…1); no evidence = untested. */
export const SKILL_LEVELS = ['weak', 'mixed', 'strong', 'untested'] as const;
export const WEAK_SCORE_BELOW = -0.15;
export const STRONG_SCORE_FROM = 0.3;

/** Mastery model (T-016). Untested skills start at the prior; "solid" needs a correct answer at exam difficulty. */
export const MASTERY_PRIOR = 0.35;
export const MASTERY_SOLID = 0.7;
export const EXAM_LEVEL_DIFFICULTY = 3;
/** A skill whose prerequisites are all at least this is "ready to learn" (planner readiness). */
export const MASTERY_READY = 0.6;
/** Repeated conceptual mistakes on one skill send it back to the foundation stage. */
export const CONCEPTUAL_RESET_COUNT = 2;
/** Below this mastery a skill shows as weak on progress bars and revision tiles (MASTERY_SOLID and up = strong). */
export const MASTERY_WEAK_BELOW = 0.4;
