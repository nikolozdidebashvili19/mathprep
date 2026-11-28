import { LessonView, QuestionSolution, TheoryCardView } from '@/features/course/types/course.types';
import { DiagnosticQuestion } from '@/features/diagnostic/types/diagnostic.types';

export type LearntSkill = { code: string; nameKa: string; mastery: number | null };

export type RevisionTopic = { code: string; nameKa: string; skills: LearntSkill[] };

export type RevisionLibraryView = {
  topics: RevisionTopic[];
  learntCount: number;
  /** Skills that have a theory card at all (learnt or not yet). */
  cardCount: number;
};

export type TheoryReviewView = {
  code: string;
  skillName: string;
  prerequisiteNames: string[];
  /** The full lesson when written, otherwise the short theory card (one of the two is always set). */
  lesson: LessonView | null;
  theory: TheoryCardView | null;
  mastery: number | null;
  /** Neighbours in the learnt list, so the student can flip through cards. */
  previous: { code: string; nameKa: string } | null;
  next: { code: string; nameKa: string } | null;
  position: number;
  total: number;
};

/** A skill's spaced-repetition state (ReviewSchedule without ids). */
export type ReviewState = { learnedAt: Date; step: number; nextReviewAt: Date | null };

/** A question the student got wrong and has not solved since (the saved-mistakes list, T-022). */
export type SavedMistake = {
  question: DiagnosticQuestion;
  skillName: string | null;
  yourAnswer: string;
  correctAnswer: string | null;
  solution: QuestionSolution | null;
  wrongCount: number;
  lastWrongAt: string;
};
