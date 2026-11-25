import { describe, expect, it } from 'vitest';

import { buildStuckLadder, isPenalisedStep, stepHintCost } from '@/features/course/service/hints';
import { StuckStep } from '@/features/course/types/course.types';
import { hintedWeight, MAX_STUCK_HINTS, SOLUTION_HINT_COST } from '@/shared/const/course.const';

const example = { problem: 'მარტივი', steps: ['e1', 'e2'], answer: '5' };
const step = (kind: StuckStep['kind']): StuckStep => ({ kind, text: '', items: [] });

describe('buildStuckLadder', () => {
  it('with guidance: asks → theory → plan → similar example → hints → walkthrough → full solution', () => {
    const ladder = buildStuckLadder({
      guidance: { restate: 'r', plan: ['p1', 'p2'], hints: ['h1', 'h2'] },
      theory: ['წესი'],
      example,
      solutionSteps: ['s1', 's2', 'answer'],
    });
    expect(ladder.map((s) => s.kind)).toEqual(['restate', 'theory', 'plan', 'example', 'hint', 'hint', 'walkthrough', 'solution']);
    expect(ladder[3].items).toEqual(['e1', 'e2', 'პასუხი: 5']);
    expect(ladder[6].items).toEqual(['s1', 's2']);
    expect(ladder[7].items).toEqual(['s1', 's2', 'answer']);
    // Only the last rung shows the final step.
    expect(ladder.slice(0, -1).flatMap((s) => [s.text, ...s.items])).not.toContain('answer');
  });

  it('without guidance: theory, example, solution steps as hints (capped), then the full solution', () => {
    const ladder = buildStuckLadder({ guidance: null, theory: ['წესი'], example: null, solutionSteps: ['1', '2', '3', '4', '5', '6'] });
    expect(ladder.map((s) => s.kind)).toEqual(['theory', ...Array(MAX_STUCK_HINTS).fill('hint'), 'solution']);
    expect(buildStuckLadder({ guidance: null, theory: [], example: null, solutionSteps: [] })).toEqual([]);
  });

  it('teaching rungs are free; hints cost one; the full solution costs the most', () => {
    expect(['restate', 'theory', 'plan', 'example'].map((k) => stepHintCost(step(k as StuckStep['kind'])))).toEqual([0, 0, 0, 0]);
    expect(stepHintCost(step('hint'))).toBe(1);
    expect(stepHintCost(step('walkthrough'))).toBe(1);
    expect(stepHintCost(step('solution'))).toBe(SOLUTION_HINT_COST);
    expect(isPenalisedStep(step('theory'))).toBe(false);
  });
});

describe('hintedWeight', () => {
  it('lowers the mastery weight per hint, not below a quarter', () => {
    expect([0, 1, 2, 3, 9].map(hintedWeight)).toEqual([1, 0.75, 0.5, 0.25, 0.25]);
  });
});

describe('theory rung from a lesson', () => {
  it('wraps each formula in $…$ so it renders as maths', async () => {
    const { ladderFor } = await import('@/features/course/service/practice-views');
    const { QuestionModel } = await import('@/features/question/schema/question.schema');
    const { SkillModel } = await import('@/features/skill/schema/skill.schema');
    const { readFileSync } = await import('node:fs');
    const lesson = JSON.parse(readFileSync('content/lessons/N2.json', 'utf8'));
    const skill = new SkillModel({ code: 'N2', topic: 'N', nameKa: 'n', nameEn: 'n', examWeight: 1, minPracticeMinutes: 1, lesson }).toObject();
    const q = new QuestionModel({ code: 'q', source: 'naec', type: 'multiple_choice', difficulty: 1, text: 't', maxPoints: 1, solutionSteps: ['a', 'b'] }).toObject();
    const theory = ladderFor(q, skill).find((s) => s.kind === 'theory');
    const first = theory?.items[0] ?? '';
    expect(first).toContain(': $\\frac{a}{b}');
    expect(first).toContain('$ — ');
  });
});
