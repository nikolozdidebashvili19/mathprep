/**
 * "I'm stuck" for a practice question (pure, zero tokens). Each press reveals the next stage, and every stage gives
 * more guidance than the one before; no stage ever shows the final answer or the full solution:
 *   1. a small hint    — what is asked + the first targeted hint
 *   2. more detail     — the next hint, the formulas (with when to use them), the steps, a similar solved example
 *   3. show your work  — the last hint + the photo step (the AI looks at the handwritten working)
 *   4. reinforcement   — easier questions first, then back to this one (not offered on inserted questions)
 * Guided problem solving (faded scaffolding) shows part of this up front for free; the stages skip what it showed.
 * Teaching steps are free; real hints lower the answer's mastery weight and XP.
 */
import { ScaffoldLevel, StuckStep } from '@/features/course/types/course.types';
import { FREE_STUCK_KINDS, HINT_COPY, MAX_STUCK_HINTS } from '@/shared/const/course.const';

export type Guidance = { restate: string; plan: string[]; hints: string[] };
export type SolvedExample = { problem: string; steps: string[]; answer: string };

export type StuckInput = {
  guidance: Guidance | null;
  /** Rules / formulas of the question's skill (lesson formulas, else theory-card rules). */
  theory: string[];
  /** An easier solved problem on the same skill. */
  example: SolvedExample | null;
  solutionSteps: string[];
};

type Step = Omit<StuckStep, 'stage'>;

/**
 * Hints in order: the stored guidance hints, else the first steps of the verified solution. Without guidance at most
 * half of the solution (never its last step) is used, so the hints cannot add up to the full solution.
 */
function hintTexts(input: StuckInput): string[] {
  if (input.guidance) return input.guidance.hints.slice(0, MAX_STUCK_HINTS);
  const withoutLast = input.solutionSteps.slice(0, Math.max(0, input.solutionSteps.length - 1));
  return withoutLast.slice(0, Math.min(MAX_STUCK_HINTS, Math.ceil(withoutLast.length / 2)));
}

const restateStep = (g: Guidance | null): Step | null => (g?.restate ? { kind: 'restate', text: g.restate, items: [] } : null);
const planStep = (g: Guidance | null): Step | null => (g && g.plan.length > 0 ? { kind: 'plan', text: HINT_COPY.planIntro, items: g.plan } : null);
const theoryStep = (theory: string[]): Step | null => (theory.length > 0 ? { kind: 'theory', text: HINT_COPY.theoryIntro, items: theory } : null);
const hintStep = (text: string): Step => ({ kind: 'hint', text, items: [] });

/**
 * Free help shown before the student asks: `full` = what is asked + the steps (or the formulas when the question has
 * no guidance yet), `light` = one small hint, `solo` / `none` = nothing.
 */
export function buildScaffold(input: StuckInput, level: ScaffoldLevel): StuckStep[] {
  const g = input.guidance;
  let steps: (Step | null)[] = [];
  if (level === 'full') steps = g ? [restateStep(g), planStep(g)] : [theoryStep(input.theory)];
  if (level === 'light') {
    const first = hintTexts(input)[0];
    steps = [first ? hintStep(first) : restateStep(g)];
  }
  return steps.filter((s): s is Step => s !== null).map((s) => ({ ...s, stage: 0 }));
}

/**
 * The question's stages. `scaffold` = what was already shown up front (skipped here); `reinforce` = whether stage 4 is
 * offered (false for questions that were themselves inserted). Empty teaching stages are dropped and the rest
 * renumbered, so stage numbers are always 1, 2, 3(, 4).
 */
export function buildStuckStages(input: StuckInput, scaffold: ScaffoldLevel = 'none', reinforce = true): StuckStep[] {
  const g = input.guidance;
  const shown = buildScaffold(input, scaffold);
  const isShown = (kind: StuckStep['kind']) => shown.some((s) => s.kind === kind);
  const hints = hintTexts(input).filter((text) => !shown.some((s) => s.kind === 'hint' && s.text === text));
  const easy = input.example;

  const stage1 = [isShown('restate') ? null : restateStep(g), hints[0] ? hintStep(hints[0]) : null];
  const stage2 = [
    hints[1] ? hintStep(hints[1]) : null,
    isShown('theory') ? null : theoryStep(input.theory),
    isShown('plan') ? null : planStep(g),
    easy ? { kind: 'example' as const, text: easy.problem, items: [...easy.steps, `${HINT_COPY.answerLabel}: ${easy.answer}`] } : null,
  ];
  const stage3 = [...hints.slice(2).map(hintStep), { kind: 'photo' as const, text: HINT_COPY.photoIntro, items: [] }];
  const stage4 = reinforce ? [{ kind: 'reinforce' as const, text: HINT_COPY.reinforceIntro, items: [] }] : [];

  const stages = [stage1, stage2, stage3, stage4]
    .map((steps) => steps.filter((s): s is Step => s !== null))
    .filter((steps) => steps.length > 0);
  return stages.flatMap((steps, i) => steps.map((s) => ({ ...s, stage: i + 1 })));
}

/** Number of stages in a built ladder (0 when there is none). */
export const stageCount = (ladder: StuckStep[]) => ladder.reduce((max, s) => Math.max(max, s.stage), 0);

/** The stage that offers the photo, and the reinforcement stage (null when the ladder has none). */
export const photoStageOf = (ladder: StuckStep[]) => ladder.find((s) => s.kind === 'photo')?.stage ?? null;
export const reinforceStageOf = (ladder: StuckStep[]) => ladder.find((s) => s.kind === 'reinforce')?.stage ?? null;

/** Teaching steps are free; each real hint costs one. */
export function stepHintCost(step: StuckStep | undefined): number {
  if (!step || FREE_STUCK_KINDS.includes(step.kind)) return 0;
  return 1;
}

/** Hint cost of revealing one stage (the sum of its steps). */
export const stageHintCost = (ladder: StuckStep[], stage: number) =>
  ladder.filter((s) => s.stage === stage).reduce((sum, s) => sum + stepHintCost(s), 0);

export const isPenalisedStep = (step: StuckStep | undefined) => stepHintCost(step) > 0;

