import { TheoryCardView } from '@/features/course/types/course.types';

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
  theory: TheoryCardView;
  mastery: number | null;
  /** Neighbours in the learnt list, so the student can flip through cards. */
  previous: { code: string; nameKa: string } | null;
  next: { code: string; nameKa: string } | null;
  position: number;
  total: number;
};
