import { describe, expect, it } from 'vitest';

import { parseModelJson } from '@/shared/utils/model-json';

const textOf = (raw: string) => (parseModelJson(raw) as { text: string }).text;

describe('parseModelJson', () => {
  it('repairs single-backslash LaTeX and keeps real escapes', () => {
    expect(textOf(String.raw`{"text": "$\frac{1}{2}$ და $5^\circ$"}`)).toBe(String.raw`$\frac{1}{2}$ და $5^\circ$`);
    expect(textOf(String.raw`{"text": "a\n\"q\""}`)).toBe('a\n"q"');
  });

  it('turns raw line breaks inside strings into spaces', () => {
    expect(textOf('{"text": "ერთი\nორი"}')).toBe('ერთი ორი');
  });

  it('unwraps a single-element array', () => {
    expect(parseModelJson('[{"a": 1}]')).toEqual({ a: 1 });
  });
});
