/**
 * Hint ladder for a practice question (pure, zero tokens): the skill's key rule from its theory card, then the
 * stored solution steps one by one — never the last step, so the answer itself is not given away.
 */
import { HINT_COPY } from '@/shared/const/course.const';

export const MAX_HINTS = 4;

export function buildHints(input: { skillName: string | null; firstRule: string | null; solutionSteps: string[] }): string[] {
  const hints: string[] = [];
  if (input.firstRule) hints.push(`${HINT_COPY.ruleHint(input.skillName ?? '')} ${input.firstRule}`);
  hints.push(...input.solutionSteps.slice(0, Math.max(0, input.solutionSteps.length - 1)));
  return hints.slice(0, MAX_HINTS);
}
