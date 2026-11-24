import { describe, expect, it } from 'vitest';

import {
  applyObservation,
  computeMastery,
  difficultyTarget,
  emptyMastery,
  observationsFromDiagnostic,
  stageFor,
} from '@/features/mastery/service/mastery-model';
import { MASTERY_PRIOR, MASTERY_SOLID } from '@/shared/const/domain.const';

const observe = (difficulty: number, outcome: number, weight = 1) => ({ skillCode: 'A7', difficulty, outcome, weight });

describe('applyObservation', () => {
  it('starts at the prior with no confidence', () => {
    expect(emptyMastery('A7')).toMatchObject({ value: MASTERY_PRIOR, confidence: 0, stage: 'foundation' });
  });

  it('raises mastery more for a correct hard question than for a correct easy one', () => {
    const easy = applyObservation(emptyMastery('A7'), observe(1, 1));
    const hard = applyObservation(emptyMastery('A7'), observe(4, 1));
    expect(hard.value).toBeGreaterThan(easy.value);
    expect(easy.value).toBeGreaterThan(MASTERY_PRIOR);
  });

  it('lowers mastery more for a wrong easy question than for a wrong hard one', () => {
    const easy = applyObservation(emptyMastery('A7'), observe(1, 0));
    const hard = applyObservation(emptyMastery('A7'), observe(5, 0));
    expect(easy.value).toBeLessThan(hard.value);
    expect(hard.value).toBeLessThan(MASTERY_PRIOR);
  });

  it('half weight moves half as far', () => {
    const full = applyObservation(emptyMastery('A7'), observe(3, 1)).value - MASTERY_PRIOR;
    const half = applyObservation(emptyMastery('A7'), observe(3, 1, 0.5)).value - MASTERY_PRIOR;
    expect(half).toBeCloseTo(full / 2, 2);
  });

  it('never reaches "solid" on easy questions alone', () => {
    const state = computeMastery(Array.from({ length: 30 }, () => observe(2, 1))).get('A7')!;
    expect(state.value).toBeLessThan(MASTERY_SOLID);
    expect(state.hardestCorrect).toBe(2);
    const proven = applyObservation(state, observe(3, 1));
    expect(proven.hardestCorrect).toBe(3);
  });

  it('grows confidence with observations and counts mistakes; repeated conceptual errors force foundation', () => {
    let s = emptyMastery('A7');
    s = applyObservation(s, { ...observe(3, 0), mistake: 'conceptual' });
    expect(s.confidence).toBeGreaterThan(0);
    s = applyObservation(s, { ...observe(3, 0), mistake: 'conceptual' });
    expect(s.mistakeCounts.conceptual).toBe(2);
    expect(s.stage).toBe('foundation');
  });
});

describe('stageFor / difficultyTarget', () => {
  it('maps values to stages and difficulties to the mastery scale', () => {
    expect([0.1, 0.4, 0.6, 0.8, 0.9].map((v) => stageFor(v, 0))).toEqual(['foundation', 'basic', 'independent', 'exam', 'advanced']);
    expect(stageFor(0.9, 2)).toBe('foundation');
    expect([1, 3, 5].map(difficultyTarget)).toEqual([0.1, 0.5, 0.9]);
  });
});

describe('observationsFromDiagnostic', () => {
  it('counts a correct answer fully, or half when the photo shows no working', () => {
    expect(observationsFromDiagnostic([{ primarySkill: 'A7', difficulty: 3, correct: true }])).toEqual([observe(3, 1)]);
    const guessed = observationsFromDiagnostic([
      { primarySkill: 'A7', difficulty: 3, correct: true, analysis: { workShown: false, mistakes: [{ type: 'incomplete', skillCode: 'A7' }], skillsShown: [] } },
    ]);
    expect(guessed).toEqual([observe(3, 1, 0.5)]);
  });

  it('blames the skill of the photo mistake and lightens the hit on the question skill', () => {
    const obs = observationsFromDiagnostic([
      {
        primarySkill: 'A7',
        difficulty: 3,
        correct: false,
        analysis: { workShown: true, mistakes: [{ type: 'calculation', skillCode: 'N2' }], skillsShown: ['A2', 'N2'] },
      },
    ]);
    expect(obs).toEqual([
      { skillCode: 'A7', difficulty: 3, outcome: 0, weight: 0.5, mistake: undefined },
      { skillCode: 'N2', difficulty: 3, outcome: 0, weight: 0.6, mistake: 'calculation' },
      { skillCode: 'A2', difficulty: 3, outcome: 1, weight: 0.4 },
    ]);
  });

  it('records a mistake on the question skill once, with its type', () => {
    const obs = observationsFromDiagnostic([
      { primarySkill: 'A7', difficulty: 2, correct: false, analysis: { workShown: true, mistakes: [{ type: 'conceptual', skillCode: 'A7' }], skillsShown: [] } },
    ]);
    expect(obs).toEqual([{ skillCode: 'A7', difficulty: 2, outcome: 0, weight: 1, mistake: 'conceptual' }]);
  });
});
