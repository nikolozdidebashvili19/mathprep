import { MistakeType } from '@/features/handwriting/types/handwriting.types';
import { SKILL_LEVELS } from '@/shared/const/domain.const';

/** What the student's browser receives for one question. Never includes the answer key. */
export type DiagnosticQuestion = {
  id: string;
  number: number;
  type: string;
  text: string;
  options: { key: string; text: string }[];
  imageUrls: string[];
  maxPoints: number;
};

export type DiagnosticSessionView = {
  id: string;
  examCode: string;
  year: number;
  questions: DiagnosticQuestion[];
  /** questionId → saved answer ('' = "I don't know"). */
  answers: Record<string, string>;
};

export type DiagnosticResult = {
  score: number;
  maxScore: number;
  correctCount: number;
  total: number;
  durationMinutes: number;
};

export type DiagnosticExamSummary = {
  code: string;
  year: number;
  variant: number;
  questionCount: number;
  maxScore: number;
  inProgress: { answered: number } | null;
  lastResult: { score: number; maxScore: number } | null;
};

/** Quick check as the browser sees it: only the current question (answers are final, the next one depends on them). */
export type QuickCheckView = {
  id: string;
  total: number;
  answeredCount: number;
  current: DiagnosticQuestion | null;
};

export type QuickSkillResult = { code: string; nameKa: string; score: number; reasons: string[] };

export type QuickCheckResult = DiagnosticResult & {
  sessionId: string;
  weak: QuickSkillResult[];
  strong: QuickSkillResult[];
  photosAnalysed: number;
  photosTotal: number;
};

export type QuickCheckSummary = {
  inProgress: { answered: number; total: number } | null;
  lastResult: { correctCount: number; total: number } | null;
};

export type DiagnosticState = {
  session: DiagnosticSessionView | null;
  currentIndex: number;
  selected: string | null;
  saving: boolean;
  error: string | null;
  result: DiagnosticResult | null;
};

export type DiagnosticActions = {
  startSession: (session: DiagnosticSessionView) => void;
  select: (answer: string | null) => void;
  recordAnswer: (questionId: string, answer: string) => void;
  goTo: (index: number) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setResult: (result: DiagnosticResult) => void;
};

export type DiagnosticStore = DiagnosticState & DiagnosticActions;

/** `answer` = choosing an option; `photo` = uploading the working for the chosen option. */
export type QuickCheckStep = 'answer' | 'photo';

export type QuickCheckState = {
  view: QuickCheckView | null;
  selected: string | null;
  step: QuickCheckStep;
  photo: Blob | null;
  photoUrl: string | null;
  busy: 'idle' | 'compressing' | 'sending' | 'finishing';
  error: string | null;
  result: QuickCheckResult | null;
};

export type QuickCheckActions = {
  startQuickCheck: (view: QuickCheckView) => void;
  select: (answer: string | null) => void;
  setStep: (step: QuickCheckStep) => void;
  setPhoto: (photo: Blob | null) => void;
  showQuestion: (view: QuickCheckView) => void;
  setBusy: (busy: QuickCheckState['busy']) => void;
  setError: (error: string | null) => void;
  setResult: (result: QuickCheckResult) => void;
};

export type QuickCheckStore = QuickCheckState & QuickCheckActions;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export type KnowledgeMapSkill = { code: string; nameKa: string; level: SkillLevel };

export type KnowledgeMapTopic = { code: string; nameKa: string; skills: KnowledgeMapSkill[] };

/** Knowledge map from the latest finished quick check. */
export type KnowledgeMap = { sessionId: string; completedAt: string; topics: KnowledgeMapTopic[] };

export type DiagnosticHistoryItem = {
  id: string;
  kind: 'quick' | 'full';
  examCode: string | null;
  completedAt: string;
  correctCount: number;
  total: number;
  score: number;
  maxScore: number;
};

export type ReviewMistake = { type: MistakeType; skillName: string; description: string };

export type ReviewAnalysis = {
  status: string;
  readable: boolean | null;
  approach: string | null;
  feedback: string | null;
  mistakes: ReviewMistake[];
};

/** One question of a finished diagnostic, with the key (safe to show once the session is closed). */
export type ReviewItem = {
  question: DiagnosticQuestion;
  correctAnswer: string;
  givenAnswer: string;
  correct: boolean;
  photoUrl: string | null;
  analysis: ReviewAnalysis | null;
  solution: { steps: string[]; commonMistake: string | null } | null;
};

export type DiagnosticReview = DiagnosticHistoryItem & {
  weak: QuickSkillResult[];
  strong: QuickSkillResult[];
  items: ReviewItem[];
};
