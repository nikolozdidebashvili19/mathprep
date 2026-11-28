import { buildScaffold, buildStuckStages, SolvedExample, StuckInput } from '@/features/course/service/hints';
import {
  LessonView,
  PracticePhotoFeedback,
  QuestionSolution,
  ScaffoldLevel,
  StuckStep,
  TheoryCardView,
} from '@/features/course/types/course.types';
import { WorkPhotoSummary } from '@/features/handwriting/types/handwriting.types';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { LessonSchema } from '@/features/skill/validations/lesson.validation';
import { MAX_STUCK_THEORY, PRACTICE_PHOTO_PER_QUESTION } from '@/shared/const/course.const';

/** Pure builders from stored documents to what the daily session sends the browser (no DB access). */

/** The question's stored explanation (null if none was verified yet). */
export const toSolution = (q: QuestionDocument | undefined): QuestionSolution | null =>
  q && (q.solutionSteps ?? []).length > 0 ? { steps: [...q.solutionSteps], commonMistake: q.commonMistakes?.[0] ?? null } : null;

/** Rules and formulas of the skill for the "theory" rung: lesson formulas first, else the theory card's rules. */
function theoryFor(skill: SkillDocument | undefined): string[] {
  const lesson = toLessonView(skill);
  const formulas = (lesson?.sections ?? []).flatMap((s) => (s.type === 'explain' ? s.formulas : []));
  if (formulas.length > 0) return formulas.slice(0, MAX_STUCK_THEORY).map((f) => `${f.name}: $${f.tex}$ — ${f.when}`);
  return [...(skill?.theoryCard?.rules ?? [])].slice(0, MAX_STUCK_THEORY);
}

/** An easier solved problem on the skill for the "example" rung: the lesson's easy example, else the card's. */
function exampleFor(skill: SkillDocument | undefined): SolvedExample | null {
  const easy = toLessonView(skill)?.sections.find((s) => s.type === 'example' && s.level === 'easy');
  if (easy?.type === 'example') return { problem: easy.problem, steps: easy.steps.map((st) => st.do), answer: easy.answer };
  const card = skill?.theoryCard?.example;
  return card ? { problem: card.problem, steps: [...card.steps], answer: card.answer } : null;
}

const stuckInput = (q: QuestionDocument, skill: SkillDocument | undefined): StuckInput => {
  const g = q.guidance;
  return {
    guidance: g?.restate ? { restate: g.restate, plan: [...g.plan], hints: [...g.hints] } : null,
    theory: theoryFor(skill),
    example: exampleFor(skill),
    solutionSteps: [...(q.solutionSteps ?? [])],
  };
};

/** What a practice item needs to build its help: its scaffold level and whether it was itself inserted. */
type HelpItem = { scaffold?: ScaffoldLevel | null; secondChance?: boolean | null; reinforcement?: boolean | null };

/**
 * The question's help: the free scaffold shown up front and the "I'm stuck" stages (without what the scaffold showed).
 * Inserted questions (second chance, reinforcement) get no stage 4, so reinforcement never nests.
 */
export function helpFor(q: QuestionDocument | undefined, skill: SkillDocument | undefined, item: HelpItem): { scaffold: StuckStep[]; ladder: StuckStep[] } {
  if (!q) return { scaffold: [], ladder: [] };
  const input = stuckInput(q, skill);
  const level = item.scaffold ?? 'none';
  return { scaffold: buildScaffold(input, level), ladder: buildStuckStages(input, level, !item.secondChance && !item.reinforcement) };
}

/** A stored practice photo as the student sees it (unreadable / other question → ask for a new photo). */
export function toPhotoFeedback(photo: WorkPhotoSummary, nameOf: (code: string) => string | null): PracticePhotoFeedback | null {
  if (!photo.mode || photo.analysis.status === 'pending') return null;
  const a = photo.analysis;
  const status: PracticePhotoFeedback['status'] =
    a.status === 'failed' ? 'failed' : a.readable === false ? 'unreadable' : a.matchesQuestion === false ? 'other_question' : 'done';
  const weak = status === 'done' ? a.mistakes[0]?.skillCode : undefined;
  return {
    mode: photo.mode,
    status,
    progress: status === 'done' ? a.progress ?? null : null,
    where: a.where ?? '',
    issue: a.issue ?? '',
    nextStep: a.nextStep ?? '',
    weakSkillName: weak ? nameOf(weak) : null,
    retakesLeft: Math.max(0, PRACTICE_PHOTO_PER_QUESTION - photo.uploads),
  };
}

/** The skill's theory card for the browser (null until one is written). */
export function toTheoryView(skill: SkillDocument | undefined): TheoryCardView | null {
  const card = skill?.theoryCard;
  if (!card) return null;
  const example = (e: { problem: string; steps: string[]; answer: string }) => ({ problem: e.problem, steps: [...e.steps], answer: e.answer });
  return {
    idea: card.idea,
    rules: [...card.rules],
    example: example(card.example),
    examExample: example(card.examExample),
    mistakes: [...card.mistakes],
    examTip: card.examTip,
  };
}

/** The skill's full lesson for the browser, re-validated on read (null until one is written). */
export function toLessonView(skill: SkillDocument | undefined): LessonView | null {
  if (!skill?.lesson) return null;
  const parsed = LessonSchema.safeParse({ ...skill.lesson, code: skill.code });
  if (!parsed.success) return null;
  const { minutes, goal, sections, summary, mistakes, examTip, reteach } = parsed.data;
  return { minutes, goal, sections, summary, mistakes, examTip, reteach };
}
