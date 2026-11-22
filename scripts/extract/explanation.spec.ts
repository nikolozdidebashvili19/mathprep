import { describe, expect, it } from 'vitest';

import { buildExplanationPrompt, checkExplanation, ModelExplanationBatchSchema, normalizeOption } from './explanation';

import type { QuestionImport } from './question-import';

const q = {
  number: 7,
  text: 'იპოვეთ $x$, თუ $2x=6$',
  options: [
    { key: 'ა', text: '$2$' },
    { key: 'ბ', text: '$3$' },
  ],
  answer: 'ბ',
} as QuestionImport;

describe('normalizeOption / checkExplanation', () => {
  it('accepts the letter in any wrapping', () => {
    expect(['ბ', 'ბ)', ' (ბ) ', 'ბ.'].map(normalizeOption)).toEqual(['ბ', 'ბ', 'ბ', 'ბ']);
  });

  it('verifies only when the model reached the key', () => {
    const e = { number: 7, steps: ['$x=3$'], finalAnswer: 'ბ)', commonMistake: '' };
    expect(checkExplanation(e, 'ბ')).toEqual({ verified: true, problems: [] });
    expect(checkExplanation({ ...e, finalAnswer: 'ა' }, 'ბ').verified).toBe(false);
  });
});

describe('buildExplanationPrompt', () => {
  it('keeps the key out of the blind prompt and puts it in the guided one', () => {
    expect(buildExplanationPrompt([q], [], false)).not.toContain('The correct option is');
    expect(buildExplanationPrompt([q], [7], true)).toContain('The correct option is ბ');
    expect(buildExplanationPrompt([q], [7], true)).toContain('(Figure: image #1)');
  });
});

describe('ModelExplanationBatchSchema', () => {
  it('accepts the wrapper, a bare array and a bare object', () => {
    const one = { number: 7, steps: ['a'], finalAnswer: 'ბ' };
    expect(ModelExplanationBatchSchema.parse({ questions: [one] }).questions).toHaveLength(1);
    expect(ModelExplanationBatchSchema.parse([one]).questions).toHaveLength(1);
    expect(ModelExplanationBatchSchema.parse(one).questions[0].commonMistake).toBe('');
  });
});
