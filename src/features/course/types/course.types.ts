import { DiagnosticQuestion } from '@/features/diagnostic/types/diagnostic.types';
import { LessonType } from '@/features/skill/validations/lesson.validation';
import { TheoryCardType } from '@/features/skill/validations/theory.validation';
import { DailyMinutes, SCAFFOLD_LEVELS, STUCK_STEP_KINDS, STUDENT_LEVELS } from '@/shared/const/course.const';
import { SESSION_BLOCK_KINDS } from '@/shared/const/domain.const';

export type BlockKind = (typeof SESSION_BLOCK_KINDS)[number];

/** What the planner needs to know about a skill (from the skill graph). */
/** How much the student already knows, from the diagnostic score (STUDENT_LEVELS). */
export type StudentLevel = (typeof STUDENT_LEVELS)[number];

export type PlannerSkillInput = {
  code: string;
  topic: string;
  examWeight: number;
  minPracticeMinutes: number;
  prerequisites: string[];
};

/** `skillCode: null` = mixed (exam practice, saved mistakes, a check or the mock). */
export type PlanBlock = { kind: BlockKind; skillCode: string | null; minutes: number };

export type PlanDay = { dayIndex: number; blocks: PlanBlock[] };

/** `weak` = shown weak by evidence, `partial` = some evidence, gap left, `untested` = no evidence yet (check-in). */
export type PlannedSkillStatus = 'weak' | 'partial' | 'untested';

export type PlannedSkill = { code: string; topic: string; gap: number; priority: number; days: number; status: PlannedSkillStatus };

export type CoursePlan = {
  durationDays: number;
  minutesPerDay: DailyMinutes;
  level: StudentLevel;
  learningDays: number;
  /** Selected skills in teaching order. */
  skills: PlannedSkill[];
  /** Skills with a gap that did not fit, highest priority first. */
  omitted: string[];
  /** Share of the needed (gap × exam weight) the plan covers, 0–1. */
  coverage: number;
  realistic: boolean;
  days: PlanDay[];
};

/** One duration × daily-time option on the setup screen. */
export type CoursePreview = {
  months: number;
  level: StudentLevel;
  minutesPerDay: DailyMinutes;
  skillCount: number;
  omittedCount: number;
  coverage: number;
  realistic: boolean;
  topics: { code: string; nameKa: string; covered: number; needed: number }[];
  /** Highest-priority skills left out (names), for the "what you'd miss" note. */
  omittedNames: string[];
};

export type BlockView = PlanBlock & { skillName: string | null };

export type DayView = { dayIndex: number; date: string; blocks: BlockView[]; completed: boolean };

export type CourseView = {
  id: string;
  durationDays: number;
  minutesPerDay: number;
  startDate: string;
  /** Today's index in the course (0-based), clamped to the course length. */
  todayIndex: number;
  coverage: number;
  realistic: boolean;
  today: DayView | null;
  upcoming: DayView[];
  /** Earlier days, most recent first (review or catch up). */
  pastDays: DayView[];
  plannedSkills: { code: string; nameKa: string; topic: string; status: PlannedSkillStatus }[];
  todayCompleted: boolean;
  omitted: { code: string; nameKa: string }[];
};

/** One step of today's session as the browser sees it. The key is only sent once the item is answered. */
export type PracticeItemView = {
  index: number;
  kind: BlockKind;
  skillCode: string | null;
  skillName: string | null;
  /** Theory items: names of the skill's prerequisites, the card (null until written) and the student's mastery. */
  prerequisiteNames: string[];
  theory: TheoryCardView | null;
  /** The full lesson, when one is written (preferred over the short theory card). */
  lesson: LessonView | null;
  /** Question items, once answered: the simpler second explanation of the question's skill. */
  reteach: LessonView['reteach'] | null;
  mastery: number | null;
  question: DiagnosticQuestion | null;
  answered: boolean;
  answer: string | null;
  correct: boolean | null;
  correctAnswer: string | null;
  /** Free guidance shown before the student asks (faded scaffolding: full → light → solo) and its steps. */
  scaffold: ScaffoldLevel;
  scaffoldSteps: StuckStep[];
  /** "I'm stuck" steps revealed so far, the stage reached (0 = none) and how many stages this question has. */
  hints: StuckStep[];
  stuckStage: number;
  stuckStages: number;
  /** Inserted after a wrong answer: an easier question on the same skill. */
  secondChance: boolean;
  /** Inserted by "I'm stuck" stage 4: an easier question before returning to the original. */
  reinforcement: boolean;
  /** Name of the weakness a reinforcement question targets (from the photo analysis), if it is not the same skill. */
  reinforcementSkillName: string | null;
  /** Warm-up before a new lesson: a quick question on something learnt earlier. */
  warmup: boolean;
  /** A spaced review (1 / 3 / 7 / 14 days after learning) of this question's skill. */
  review: boolean;
  /** The latest analysed photo of the handwritten working for this question (stage 3, or after a wrong answer). */
  workPhoto: PracticePhotoFeedback | null;
  /** Step-by-step explanation; only after the item is answered (it would give the answer away). */
  solution: QuestionSolution | null;
};

/** One rung of the "I'm stuck" ladder (what is asked → steps → hints → walkthrough). */
export type StuckStep = { kind: (typeof STUCK_STEP_KINDS)[number]; stage: number; text: string; items: string[] };

export type ScaffoldLevel = (typeof SCAFFOLD_LEVELS)[number];

/**
 * What the photo analysis tells the student. `stuck` = before answering (where they went wrong or stopped + one next
 * step, never the answer); `mistake` = after a wrong answer (the exact wrong step and how to fix it).
 * `unreadable` / `other_question` ask for a new photo instead of guessing.
 */
export type PracticePhotoFeedback = {
  mode: 'stuck' | 'mistake';
  status: 'done' | 'unreadable' | 'other_question' | 'failed';
  progress: 'mistake' | 'stopped' | 'on_track' | null;
  where: string;
  issue: string;
  nextStep: string;
  weakSkillName: string | null;
  retakesLeft: number;
};

export type PracticeHintResult = {
  hints: StuckStep[];
  stage: number;
  stages: number;
  /** Stage 4: easier questions inserted before the original (which moves after them). */
  inserted: PracticeItemView[];
};

/** A full lesson as the browser sees it (content/lessons/, validated by LessonSchema). */
export type LessonView = Omit<LessonType, 'code' | 'status'>;

/** Stored explanation of a question (generated once offline, verified against the answer key). */
export type QuestionSolution = { steps: string[]; commonMistake: string | null };

export type PracticeSessionView = {
  id: string | null;
  dayIndex: number;
  /** Weekly check / final mock day: no practice session (T-023, T-025). */
  checkDay: boolean;
  completed: boolean;
  items: PracticeItemView[];
};

export type PracticeAnswerResult = {
  correct: boolean;
  correctAnswer: string | null;
  solution: QuestionSolution | null;
  reteach: LessonView['reteach'] | null;
  /** Set when this answer finished the day. */
  summary: { correctCount: number; questionCount: number } | null;
  /** Set after a wrong answer: the next item, already inserted into the session. */
  secondChance: PracticeItemView | null;
  /** Adaptive difficulty: the block's next question was swapped one level up (streak) or down (after a miss). */
  adjusted: { index: number; item: PracticeItemView; direction: 'up' | 'down' } | null;
};

export type PracticeFeedback = {
  correct: boolean;
  correctAnswer: string | null;
  solution: QuestionSolution | null;
  reteach: LessonView['reteach'] | null;
  /** The next question became one level harder after a streak. */
  levelUp?: boolean;
};

export type PracticeState = {
  view: PracticeSessionView | null;
  index: number;
  selected: string | null;
  feedback: PracticeFeedback | null;
  busy: boolean;
  error: string | null;
  summary: PracticeAnswerResult['summary'];
};

export type PracticeActions = {
  startPractice: (view: PracticeSessionView) => void;
  select: (answer: string | null) => void;
  markAnswered: (index: number, answer: string, feedback: PracticeFeedback) => void;
  next: () => void;
  back: () => void;
  setHints: (index: number, hints: StuckStep[], stage: number) => void;
  /** Adds questions at `position` (already saved on the server) and renumbers the items. */
  insertItems: (position: number, items: PracticeItemView[]) => void;
  /** Swaps an unanswered item for another (adaptive difficulty). */
  replaceItem: (index: number, item: PracticeItemView) => void;
  setWorkPhoto: (index: number, feedback: PracticePhotoFeedback) => void;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  setSummary: (summary: PracticeAnswerResult['summary']) => void;
};

export type PracticeStore = PracticeState & PracticeActions;

export type TheoryCardView = Omit<TheoryCardType, 'code' | 'status'>;
