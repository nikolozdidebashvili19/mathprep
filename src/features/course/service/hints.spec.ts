import { describe, expect, it } from 'vitest';

import { buildHints, MAX_HINTS } from '@/features/course/service/hints';
import { hintedWeight } from '@/shared/const/course.const';

describe('buildHints', () => {
  it('starts with the skill rule, then solution steps without the last one', () => {
    const hints = buildHints({ skillName: 'წილადები', firstRule: '$\frac{a}{b}=\frac{ak}{bk}$', solutionSteps: ['s1', 's2', 'answer'] });
    expect(hints).toHaveLength(3);
    expect(hints[0]).toContain('წილადები');
    expect(hints[0]).toContain('\frac{a}{b}');
    expect(hints.slice(1)).toEqual(['s1', 's2']);
  });

  it('never gives the final step and caps the ladder', () => {
    expect(buildHints({ skillName: null, firstRule: null, solutionSteps: ['only'] })).toEqual([]);
    const many = buildHints({ skillName: 'x', firstRule: 'r', solutionSteps: ['1', '2', '3', '4', '5', '6'] });
    expect(many).toHaveLength(MAX_HINTS);
    expect(many).not.toContain('6');
  });
});

describe('hintedWeight', () => {
  it('lowers the mastery weight per hint, not below a quarter', () => {
    expect([0, 1, 2, 3, 9].map(hintedWeight)).toEqual([1, 0.75, 0.5, 0.25, 0.25]);
  });
});
