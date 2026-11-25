import { describe, expect, it } from 'vitest';

import { splitBold, splitMathSegments } from '@/shared/utils/math-text';

describe('splitMathSegments', () => {
  it('splits prose and inline math', () => {
    expect(splitMathSegments('იპოვეთ $x$, თუ $x^2=4$.')).toEqual([
      { kind: 'text', value: 'იპოვეთ ' },
      { kind: 'math', value: 'x' },
      { kind: 'text', value: ', თუ ' },
      { kind: 'math', value: 'x^2=4' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('handles math-only and text-only strings', () => {
    expect(splitMathSegments('$\\frac{1}{2}$')).toEqual([{ kind: 'math', value: '\\frac{1}{2}' }]);
    expect(splitMathSegments('არც ერთი')).toEqual([{ kind: 'text', value: 'არც ერთი' }]);
  });

  it('keeps an unmatched dollar as text', () => {
    expect(splitMathSegments('ფასი 5$ ')).toEqual([{ kind: 'text', value: 'ფასი 5$ ' }]);
  });

  it('drops empty math', () => {
    expect(splitMathSegments('a $$ b')).toEqual([
      { kind: 'text', value: 'a ' },
      { kind: 'text', value: ' b' },
    ]);
  });
});

describe('splitBold', () => {
  it('marks **bold** parts and keeps unmatched markers as text', () => {
    expect(splitBold('ეს არის **უსგ**, არა უსჯ')).toEqual([
      { bold: false, value: 'ეს არის ' },
      { bold: true, value: 'უსგ' },
      { bold: false, value: ', არა უსჯ' },
    ]);
    expect(splitBold('a ** b')).toEqual([{ bold: false, value: 'a ** b' }]);
  });
});
