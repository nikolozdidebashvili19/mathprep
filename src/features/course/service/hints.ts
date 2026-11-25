/**
 * "I'm stuck" ladder for a practice question (pure, zero tokens). Each press reveals the next rung:
 *   1. restate     — what the question asks, in very simple words              (guidance)
 *   2. theory      — the rules and formulas this question needs                 (the skill's lesson / theory card)
 *   3. plan        — the problem split into small steps                         (guidance)
 *   4. example     — a similar, easier problem solved step by step              (the skill's lesson / theory card)
 *   5. hint …      — hints that get more specific one by one                    (guidance, or the solution steps)
 *   6. walkthrough — the reasoning step by step, without the final step         (verified solution)
 *   7. solution    — the full solution, as a last resort                        (verified solution)
 * Rungs 1–4 teach and are free; 5–7 lower the answer's mastery weight and XP (the full solution the most).
 * The live tutor (stuck mode, never gives the answer) is available from the first rung on.
 */
import { StuckStep } from '@/features/course/types/course.types';
import { FREE_STUCK_KINDS, HINT_COPY, MAX_STUCK_HINTS, SOLUTION_HINT_COST } from '@/shared/const/course.const';

export type Guidance = { restate: string; plan: string[]; hints: string[] };
export type SolvedExample = { problem: string; steps: string[]; answer: string };

export function buildStuckLadder(input: {
  guidance: Guidance | null;
  /** Rules / formulas of the question's skill (lesson formulas, else theory-card rules). */
  theory: string[];
  /** An easier solved problem on the same skill. */
  example: SolvedExample | null;
  solutionSteps: string[];
}): StuckStep[] {
  const steps = input.solutionSteps;
  const withoutAnswer = steps.slice(0, Math.max(0, steps.length - 1));
  const g = input.guidance;
  const ladder: StuckStep[] = [];

  if (g) ladder.push({ kind: 'restate', text: g.restate, items: [] });
  if (input.theory.length > 0) ladder.push({ kind: 'theory', text: HINT_COPY.theoryIntro, items: input.theory });
  if (g && g.plan.length > 0) ladder.push({ kind: 'plan', text: HINT_COPY.planIntro, items: g.plan });
  if (input.example) {
    ladder.push({
      kind: 'example',
      text: input.example.problem,
      items: [...input.example.steps, `${HINT_COPY.answerLabel}: ${input.example.answer}`],
    });
  }
  const hints = g ? g.hints : withoutAnswer;
  ladder.push(...hints.slice(0, MAX_STUCK_HINTS).map((text) => ({ kind: 'hint' as const, text, items: [] })));
  if (g && withoutAnswer.length > 0) ladder.push({ kind: 'walkthrough', text: HINT_COPY.walkthroughIntro, items: withoutAnswer });
  if (steps.length > 0) ladder.push({ kind: 'solution', text: HINT_COPY.solutionIntro, items: steps });
  return ladder;
}

/** Teaching rungs are free; hints and the walkthrough cost one hint; the full solution costs the most. */
export function stepHintCost(step: StuckStep | undefined): number {
  if (!step || FREE_STUCK_KINDS.includes(step.kind)) return 0;
  return step.kind === 'solution' ? SOLUTION_HINT_COST : 1;
}

export const isPenalisedStep = (step: StuckStep | undefined) => stepHintCost(step) > 0;
