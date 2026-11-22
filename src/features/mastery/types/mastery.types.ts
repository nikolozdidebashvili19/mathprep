import { MASTERY_STAGES } from '@/shared/const/domain.const';

export type MasteryStage = (typeof MASTERY_STAGES)[number];

export type MistakeCounts = { conceptual: number; calculation: number; misread: number; incomplete: number };

/** One student's mastery of one skill (what the Mastery document stores, minus ids). */
export type MasteryState = {
  skillCode: string;
  value: number;
  confidence: number;
  observations: number;
  hardestCorrect: number;
  stage: MasteryStage;
  mistakeCounts: MistakeCounts;
};
