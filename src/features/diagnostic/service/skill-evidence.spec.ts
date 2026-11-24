import { describe, expect, it } from 'vitest';

import { computeSkillEvidence, EvidenceItem } from '@/features/diagnostic/service/skill-evidence';
import { QUICK_CHECK_REASONS } from '@/shared/const/diagnostic.const';

const prereqs = new Map([['A7', ['A2', 'N6']]]);
const byCode = (items: EvidenceItem[]) => Object.fromEntries(computeSkillEvidence(items, prereqs).map((e) => [e.skillCode, e]));

describe('computeSkillEvidence', () => {
  it('credits a correct answer and its prerequisites', () => {
    const r = byCode([{ primarySkill: 'A7', difficulty: 4, answered: true, correct: true }]);
    expect(r.A7.score).toBeGreaterThan(0.4);
    expect(r.A7.reasons).toEqual([QUICK_CHECK_REASONS.correct]);
    expect(r.A2.score).toBeGreaterThan(0);
    expect(r.A2.score).toBeLessThan(r.A7.score);
  });

  it('halves the credit when the photo shows no working', () => {
    const plain = byCode([{ primarySkill: 'A7', difficulty: 3, answered: true, correct: true }]);
    const noWork = byCode([
      { primarySkill: 'A7', difficulty: 3, answered: true, correct: true, analysis: { workShown: false, mistakes: [], skillsShown: [] } },
    ]);
    expect(noWork.A7.score).toBeLessThan(plain.A7.score);
    expect(noWork.A7.reasons).toEqual([QUICK_CHECK_REASONS.correctNoWork]);
  });

  it('does not count "incomplete" against a correct answer twice', () => {
    const r = byCode([
      {
        primarySkill: 'A7',
        difficulty: 3,
        answered: true,
        correct: true,
        analysis: { workShown: false, mistakes: [{ type: 'incomplete', skillCode: 'A7', description: 'ამოხსნა არ ჩანს' }], skillsShown: [] },
      },
    ]);
    expect(r.A7.score).toBeGreaterThan(0);
    expect(r.A7.reasons).toEqual([QUICK_CHECK_REASONS.correctNoWork]);
  });

  it('blames the skill of the mistake found in the photo, not only the question topic', () => {
    const r = byCode([
      {
        primarySkill: 'A7',
        difficulty: 3,
        answered: true,
        correct: false,
        analysis: {
          workShown: true,
          mistakes: [{ type: 'conceptual', skillCode: 'N6', description: 'ფესვი არასწორად გამოიტანა' }],
          skillsShown: ['A2'],
        },
      },
    ]);
    expect(r.N6.score).toBeLessThan(r.A7.score);
    expect(r.N6.reasons).toEqual(['ფესვი არასწორად გამოიტანა']);
    expect(r.A7.score).toBeLessThan(0);
    expect(r.A2.score).toBeGreaterThan(0);
  });

  it('treats "I don\'t know" as full evidence against the skill and sorts weakest first', () => {
    const result = computeSkillEvidence(
      [
        { primarySkill: 'G7', difficulty: 2, answered: false, correct: false },
        { primarySkill: 'L1', difficulty: 2, answered: true, correct: true },
      ],
      prereqs
    );
    expect(result[0]).toMatchObject({ skillCode: 'G7', reasons: [QUICK_CHECK_REASONS.dontKnow] });
    expect(result[0].score).toBeLessThan(0);
    expect(result.at(-1)?.skillCode).toBe('L1');
  });
});
