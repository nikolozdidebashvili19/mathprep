import { MISTAKE_TYPES, PHOTO_PROGRESS, PRACTICE_PHOTO_MODES } from '@/shared/const/domain.const';

export type MistakeType = (typeof MISTAKE_TYPES)[number];

export type PhotoProgress = (typeof PHOTO_PROGRESS)[number];

export type PracticePhotoMode = (typeof PRACTICE_PHOTO_MODES)[number];

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

/** A practice photo's analysis: where the working goes wrong or stops, the issue, and the next step. */
export type CompletedPracticeAnalysis = {
  status: 'done';
  readable: boolean;
  matchesQuestion: boolean;
  progress: PhotoProgress;
  where: string;
  issue: string;
  nextStep: string;
  mistakes: WorkMistake[];
  skillsShown: string[];
  provider: string;
  model: string;
  analyzedAt: Date;
};

/** Photo metadata without the image bytes (what services pass around). */
export type WorkPhotoSummary = {
  id: string;
  questionId: string;
  /** Practice photos: why it was taken and how many photos were sent for the question. */
  mode: PracticePhotoMode | null;
  uploads: number;
  analysis: {
    status: string;
    readable?: boolean | null;
    matchesQuestion?: boolean | null;
    workShown?: boolean | null;
    approach?: string | null;
    mistakes: WorkMistake[];
    skillsShown: string[];
    feedback?: string | null;
    progress?: PhotoProgress | null;
    where?: string | null;
    issue?: string | null;
    nextStep?: string | null;
  };
};

/** What the practice photo prompt needs. `stuck` = not answered yet (never reveal); `mistake` = answered wrong. */
export type PracticePhotoContext = {
  mode: PracticePhotoMode;
  question: { text: string; options: { key: string; text: string }[]; answer: string };
  studentAnswer: string;
  solutionSteps: string[];
  skills: AnalysisSkill[];
};

/** One skill the analysis prompt may name, with its Georgian name for the model's context. */
export type AnalysisSkill = { code: string; nameKa: string; nameEn: string };
