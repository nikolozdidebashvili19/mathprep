import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import katex from 'katex';
import { describe, expect, it } from 'vitest';

import { TheoryCardSchema, TheoryCardType } from '@/features/skill/validations/theory.validation';
import { splitMathSegments } from '@/shared/utils/math-text';

const THEORY_DIR = path.resolve(process.cwd(), 'content/theory');
const files = readdirSync(THEORY_DIR).filter((f) => f.endsWith('.json'));
const skillCodes = new Set<string>(
  JSON.parse(readFileSync(path.resolve(process.cwd(), 'content/skills.json'), 'utf8')).skills.map((s: { code: string }) => s.code)
);

const allText = (card: TheoryCardType) => [
  card.idea,
  ...card.rules,
  card.example.problem,
  ...card.example.steps,
  card.example.answer,
  card.examExample.problem,
  ...card.examExample.steps,
  card.examExample.answer,
  ...card.mistakes,
  card.examTip,
];

describe('content/theory cards', () => {
  it('exist', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s is valid, named after a real skill, and every formula renders in KaTeX', (file) => {
    const parsed = TheoryCardSchema.safeParse(JSON.parse(readFileSync(path.join(THEORY_DIR, file), 'utf8')));
    expect(parsed.error?.issues ?? []).toEqual([]);
    const card = parsed.data!;
    expect(`${card.code}.json`).toBe(file);
    expect(skillCodes.has(card.code)).toBe(true);

    for (const text of allText(card)) {
      // A control character means a broken escape (e.g. "\t" in "\text" became a tab).
      expect(/[\u0000-\u001f]/.test(text), JSON.stringify(text)).toBe(false);
      for (const segment of splitMathSegments(text).filter((s) => s.kind === 'math')) {
        expect(() => katex.renderToString(segment.value, { throwOnError: true }), segment.value).not.toThrow();
      }
    }
  });
});
