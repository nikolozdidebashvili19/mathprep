import { describe, expect, it } from 'vitest';

import { buildGuidancePrompt, checkGuidance, ModelGuidanceBatchSchema, type ModelGuidance } from './guidance';

import type { QuestionImport } from './question-import';

const g = (over: Partial<ModelGuidance> = {}): ModelGuidance => ({
  number: 1,
  restate: 'გვეკითხებიან, რას უდრის $x$.',
  plan: ['ჯერ გადაიტანე რიცხვები ერთ მხარეს', 'მერე გაყავი'],
  hints: ['გამოიყენე განტოლების თვისება: ორივე მხარე შეიძლება გაიყოს ერთსა და იმავე რიცხვზე.'],
  ...over,
});

describe('checkGuidance', () => {
  it('accepts guidance that does not give the answer away', () => {
    expect(checkGuidance(g(), '$\\frac{3}{14}$', '$x = \\frac{3}{14}$, ანუ ვარიანტი გ.')).toEqual({ ok: true, problems: [] });
  });

  it('rejects the correct option text, the final step, or a giveaway phrase', () => {
    expect(checkGuidance(g({ hints: ['შედეგი: $\\frac{3}{14}$'] }), '$\\frac{3}{14}$', '').ok).toBe(false);
    expect(checkGuidance(g({ hints: ['ბოლოს $x=\\frac{3}{14}$, ანუ ვარიანტი გ'] }), '', '$x=\\frac{3}{14}$, ანუ ვარიანტი გ').ok).toBe(false);
    expect(checkGuidance(g({ restate: 'სწორი პასუხი გ-ა' }), '', '').ok).toBe(false);
  });

  it('does not flag harmless mentions of "the correct answer"', () => {
    expect(checkGuidance(g({ restate: 'გამოთვალე და იპოვე სწორი პასუხი.' }), '', '').ok).toBe(true);
    expect(checkGuidance(g({ restate: 'შეადარე ვარიანტები.' }), '', '').ok).toBe(true);
  });

  it('ignores very short answers (a single digit can appear legitimately) and enforces the shape', () => {
    expect(checkGuidance(g({ hints: ['ჯერ $3$-ზე გაყავი'] }), '$3$', '').ok).toBe(true);
    expect(checkGuidance(g({ hints: ['1', '2', '3', '4'] }), '', '').ok).toBe(false);
  });
});

describe('guidance prompt and parsing', () => {
  it('passes the verified solution and forbids revealing the answer', () => {
    const question = { number: 4, text: 'Q', options: [{ key: 'ა', text: '1' }] } as QuestionImport;
    const prompt = buildGuidancePrompt([{ question, steps: ['s1', 's2'] }]);
    expect(prompt).toContain('1. s1 2. s2');
    expect(prompt).toContain('NEVER reveal the final result');
  });

  it('accepts a bare array from the model', () => {
    expect(ModelGuidanceBatchSchema.parse([g()]).questions).toHaveLength(1);
  });
});
