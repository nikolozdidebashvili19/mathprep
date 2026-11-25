import { buildStuckLadder, SolvedExample } from '@/features/course/service/hints';
import { LessonView, QuestionSolution, StuckStep, TheoryCardView } from '@/features/course/types/course.types';
import { QuestionDocument } from '@/features/question/schema/question.schema';
import { SkillDocument } from '@/features/skill/schema/skill.schema';
import { LessonSchema } from '@/features/skill/validations/lesson.validation';
import { MAX_STUCK_THEORY } from '@/shared/const/course.const';

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

/** The question's "I'm stuck" ladder: guidance, the skill's theory and example, hints, walkthrough, solution. */
export function ladderFor(q: QuestionDocument | undefined, skill: SkillDocument | undefined): StuckStep[] {
  if (!q) return [];
  const g = q.guidance;
  return buildStuckLadder({
    guidance: g?.restate ? { restate: g.restate, plan: [...g.plan], hints: [...g.hints] } : null,
    theory: theoryFor(skill),
    example: exampleFor(skill),
    solutionSteps: [...(q.solutionSteps ?? [])],
  });
}

/** Rungs already revealed (older items only counted real hints). */
export const revealedSteps = (item: { guideStepsUsed?: number | null; hintsUsed?: number | null }) => item.guideStepsUsed || item.hintsUsed || 0;

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
