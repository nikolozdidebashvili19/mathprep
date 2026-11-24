import { MISTAKE_TYPES } from '@/shared/const/domain.const';

export type MistakeType = (typeof MISTAKE_TYPES)[number];

export type WorkMistake = { type: MistakeType; skillCode: string; description: string };

/** Analysis fields written after the model answered (status `done`). */
export type CompletedWorkAnalysis = {
  status: 'done';
  readable: boolean;
  matchesQuestion: boolean;
  workShown: boolean;
  approach: string;
  mistakes: WorkMistake[];
  skillsShown: string[];
  feedback: string;
  provider: string;
  model: string;
  analyzedAt: Date;
};

export type FailedWorkAnalysis = { status: 'failed'; error: string; provider: string; model: string; analyzedAt: Date };

/** Photo metadata without the image bytes (what services pass around). */
export type WorkPhotoSummary = {
  id: string;
  questionId: string;
  analysis: {
    status: string;
    readable?: boolean | null;
    workShown?: boolean | null;
    approach?: string | null;
    mistakes: WorkMistake[];
    skillsShown: string[];
    feedback?: string | null;
  };
};

/** One skill the analysis prompt may name, with its Georgian name for the model's context. */
export type AnalysisSkill = { code: string; nameKa: string; nameEn: string };
