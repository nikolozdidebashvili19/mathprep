import { describe, expect, it } from 'vitest';

import {
  buildScaffold,
  buildStuckStages,
  isPenalisedStep,
  photoStageOf,
  reinforceStageOf,
  stageCount,
  stageHintCost,
  stepHintCost,
  StuckInput,
} from '@/features/course/service/hints';
import { StuckStep } from '@/features/course/types/course.types';
import { hintedWeight, MAX_STUCK_HINTS } from '@/shared/const/course.const';

const example = { problem: 'მარტივი', steps: ['e1', 'e2'], answer: '5' };
const step = (kind: StuckStep['kind']): StuckStep => ({ kind, stage: 1, text: '', items: [] });
const guided: StuckInput = {
  guidance: { restate: 'r', plan: ['p1', 'p2'], hints: ['h1', 'h2', 'h3'] },
  theory: ['წესი'],
  example,
  solutionSteps: ['s1', 's2', 'answer'],
};
const shape = (ladder: StuckStep[]) => ladder.map((s) => `${s.stage}:${s.kind}${s.kind === 'hint' ? `(${s.text})` : ''}`);
const allText = (ladder: StuckStep[]) => ladder.flatMap((s) => [s.text, ...s.items]);

describe('buildStuckStages', () => {
  it('four stages, each with more help: a small hint → more detail → the photo → easier questions', () => {
    expect(shape(buildStuckStages(guided))).toEqual([
      '1:restate',
      '1:hint(h1)',
      '2:hint(h2)',
      '2:theory',
      '2:plan',
      '2:example',
      '3:hint(h3)',
      '3:photo',
      '4:reinforce',
    ]);
  });

  it('never shows the final step or the full solution', () => {
    expect(allText(buildStuckStages(guided))).not.toContain('answer');
    const fallback = buildStuckStages({ guidance: null, theory: [], example: null, solutionSteps: ['1', '2', '3', '4', '5', 'answer'] });
    expect(allText(fallback)).not.toContain('answer');
    // Without guidance at most half of the solution becomes hints (here 3 of 6 steps).
    expect(fallback.filter((s) => s.kind === 'hint').map((s) => s.text)).toEqual(['1', '2', '3']);
    expect(fallback.filter((s) => s.kind === 'hint').length).toBeLessThanOrEqual(MAX_STUCK_HINTS);
  });

  it('drops empty teaching stages and renumbers, so the photo and reinforcement stages always exist', () => {
    const ladder = buildStuckStages({ guidance: null, theory: [], example: null, solutionSteps: [] });
    expect(shape(ladder)).toEqual(['1:photo', '2:reinforce']);
    expect([stageCount(ladder), photoStageOf(ladder), reinforceStageOf(ladder)]).toEqual([2, 1, 2]);
  });

  it('inserted questions get no reinforcement stage (it never nests)', () => {
    const ladder = buildStuckStages(guided, 'none', false);
    expect(reinforceStageOf(ladder)).toBeNull();
    expect(stageCount(ladder)).toBe(3);
  });

  it('skips what the scaffold already showed', () => {
    // full = what is asked + the steps up front → stage 1 is just the first hint, stage 2 has no plan.
    expect(shape(buildStuckStages(guided, 'full'))).toEqual(['1:hint(h1)', '2:hint(h2)', '2:theory', '2:example', '3:hint(h3)', '3:photo', '4:reinforce']);
    // light = the first hint up front → the stages start from the second hint.
    expect(shape(buildStuckStages(guided, 'light')).slice(0, 2)).toEqual(['1:restate', '1:hint(h2)']);
  });
});

describe('buildScaffold', () => {
  it('full: solved together (what is asked + the steps); light: one hint; solo and none: nothing', () => {
    expect(buildScaffold(guided, 'full').map((s) => s.kind)).toEqual(['restate', 'plan']);
    expect(buildScaffold(guided, 'light')).toEqual([{ kind: 'hint', stage: 0, text: 'h1', items: [] }]);
    expect(buildScaffold(guided, 'solo')).toEqual([]);
    expect(buildScaffold(guided, 'none')).toEqual([]);
  });

  it('without guidance: the formulas when solving together, the first solution step as the hint', () => {
    const plain = { ...guided, guidance: null };
    expect(buildScaffold(plain, 'full').map((s) => s.kind)).toEqual(['theory']);
    expect(buildScaffold(plain, 'light')[0]).toMatchObject({ kind: 'hint', text: 's1' });
  });
});

describe('hint cost', () => {
  it('teaching steps, the photo and reinforcement are free; each real hint costs one', () => {
    const free: StuckStep['kind'][] = ['restate', 'theory', 'plan', 'example', 'photo', 'reinforce'];
    expect(free.map((k) => stepHintCost(step(k)))).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stepHintCost(step('hint'))).toBe(1);
    expect(isPenalisedStep(step('theory'))).toBe(false);
    const ladder = buildStuckStages(guided);
    expect([1, 2, 3, 4].map((stage) => stageHintCost(ladder, stage))).toEqual([1, 1, 1, 0]);
  });
});

describe('hintedWeight', () => {
  it('lowers the mastery weight per hint, not below a quarter', () => {
    expect([0, 1, 2, 3, 9].map(hintedWeight)).toEqual([1, 0.75, 0.5, 0.25, 0.25]);
  });
});

describe('theory step from a lesson', () => {
  it('wraps each formula in $…$ so it renders as maths', async () => {
    const { helpFor } = await import('@/features/course/service/practice-views');
    const { QuestionModel } = await import('@/features/question/schema/question.schema');
    const { SkillModel } = await import('@/features/skill/schema/skill.schema');
    const { readFileSync } = await import('node:fs');
    const lesson = JSON.parse(readFileSync('content/lessons/N2.json', 'utf8'));
    const skill = new SkillModel({ code: 'N2', topic: 'N', nameKa: 'n', nameEn: 'n', examWeight: 1, minPracticeMinutes: 1, lesson }).toObject();
    const q = new QuestionModel({ code: 'q', source: 'naec', type: 'multiple_choice', difficulty: 1, text: 't', maxPoints: 1, solutionSteps: ['a', 'b'] }).toObject();
    const theory = helpFor(q, skill, {}).ladder.find((s) => s.kind === 'theory');
    const first = theory?.items[0] ?? '';
    expect(first).toContain(': $\\frac{a}{b}');
    expect(first).toContain('$ — ');
  });
});
