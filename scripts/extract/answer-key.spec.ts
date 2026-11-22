import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { AnswerKeySchema, checkAnswerKey, type AnswerKey } from './answer-key';

const KEYS_DIR = path.resolve(__dirname, '../../content/answer-keys');
const INDEX = JSON.parse(readFileSync(path.resolve(__dirname, '../../content/index.json'), 'utf8')) as {
  id: string;
  year: number;
  locator?: { status: string };
  questions: unknown[];
}[];

const baseKey: AnswerKey = {
  examId: '2024-V1',
  source: 'x.png',
  method: 'test',
  verified: false,
  mc: { 1: 'ა', 2: 'ბ' },
  written: [3, 4],
};

describe('checkAnswerKey', () => {
  it('accepts a consistent key', () => {
    expect(checkAnswerKey(baseKey, 4)).toEqual([]);
  });

  it('flags gaps between MC and written numbers', () => {
    expect(checkAnswerKey({ ...baseKey, written: [4, 5] })).not.toEqual([]);
  });

  it('flags a question count that differs from the exam', () => {
    expect(checkAnswerKey(baseKey, 5)).toEqual(['covers 4 questions, exam has 5']);
  });

  it('flags a final answer on an MC question', () => {
    expect(checkAnswerKey({ ...baseKey, final: { 1: 'x' } })).toHaveLength(1);
  });

  it('rejects letters outside ა–დ', () => {
    expect(AnswerKeySchema.safeParse({ ...baseKey, mc: { 1: 'ე' } }).success).toBe(false);
  });
});

describe('content/answer-keys', () => {
  const files = readdirSync(KEYS_DIR).filter((f) => f.endsWith('.json'));

  it('has a key for every exam in the index', () => {
    expect(files.map((f) => f.replace('.json', '')).sort()).toEqual(INDEX.map((e) => e.id).sort());
  });

  it.each(files)('%s is valid and matches the exam length', (file) => {
    const key = AnswerKeySchema.parse(JSON.parse(readFileSync(path.join(KEYS_DIR, file), 'utf8')));
    const exam = INDEX.find((e) => e.id === key.examId);
    expect(exam).toBeDefined();
    // Exams before 2020 were only partly located (T-006); they all have 40 questions.
    const expected = exam!.locator?.status === 'complete' ? exam!.questions.length : 40;
    expect(checkAnswerKey(key, expected)).toEqual([]);
  });
});
