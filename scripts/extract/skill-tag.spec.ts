import { describe, expect, it } from 'vitest';

import {
  buildTagPrompt,
  checkTag,
  computeExamWeights,
  MIN_EXAM_WEIGHT,
  ModelTagBatchSchema,
  recencyWeight,
  toSkillTag,
  type ModelTag,
  type SkillTag,
} from './skill-tag';

import type { QuestionImport } from './question-import';

const codes = new Set(['A4', 'A7', 'G4', 'N2']);
const by = { provider: 'gemini', model: 'm' };
const tag: ModelTag = { number: 3, skills: ['A7', 'N2'], primarySkill: 'A7', difficulty: 3, offProgram: false, confidence: 0.9, notes: '' };

describe('checkTag', () => {
  it('accepts a clean tag', () => {
    expect(checkTag(tag, codes)).toEqual([]);
  });

  it('flags unknown codes, a missing primary and low confidence', () => {
    expect(checkTag({ ...tag, skills: ['A7', 'Z9'], primarySkill: 'G4', confidence: 0.4 }, codes)).toEqual([
      'unknown skill codes: Z9',
      'primary skill is not one of the skills',
      'low model confidence (0.4)',
    ]);
  });

  it('allows no skills only for off-program questions', () => {
    expect(checkTag({ ...tag, skills: [], primarySkill: null }, codes)).toEqual(['no skills given']);
    expect(checkTag({ ...tag, skills: [], primarySkill: null, offProgram: true }, codes)).toEqual([]);
  });
});

describe('toSkillTag', () => {
  it('drops unknown codes and falls back to the first known skill as primary', () => {
    const result = toSkillTag('2024-V1-Q03', { ...tag, skills: ['Z9', 'G4', 'G4'], primarySkill: 'Z9' }, codes, by);
    expect(result).toMatchObject({ skills: ['G4'], primarySkill: 'G4' });
    expect(result.problems).toContain('unknown skill codes: Z9');
  });
});

describe('ModelTagBatchSchema', () => {
  it('accepts a bare array or a bare object as the batch', () => {
    expect(ModelTagBatchSchema.parse([tag]).questions).toHaveLength(1);
    expect(ModelTagBatchSchema.parse(tag).questions[0].number).toBe(3);
  });

  it('rejects a difficulty outside 1-5', () => {
    expect(ModelTagBatchSchema.safeParse({ questions: [{ ...tag, difficulty: 7 }] }).success).toBe(false);
  });
});

describe('buildTagPrompt', () => {
  it('lists every question, its answer and its figure number', () => {
    const q = {
      number: 12,
      type: 'multiple_choice',
      maxPoints: 1,
      text: 'იპოვეთ $x$',
      options: [{ key: 'ა', text: '$1$' }],
      answer: 'ა',
    } as QuestionImport;
    const prompt = buildTagPrompt(2024, [q], [{ code: 'A4', nameEn: 'Linear equations', topic: 'A' }], [12]);
    expect(prompt).toContain('A4: Linear equations');
    expect(prompt).toContain('### Question 12 (multiple choice, 1 pt)');
    expect(prompt).toContain('Correct answer: ა');
    expect(prompt).toContain('(Figure: image #1)');
  });
});

describe('computeExamWeights', () => {
  const st = (over: Partial<SkillTag>): SkillTag => ({
    code: 'x', skills: ['A7'], primarySkill: 'A7', difficulty: 3, offProgram: false, confidence: 1, notes: '', problems: [], provider: 'g', model: 'm', ...over,
  });

  it('weights recent years more', () => {
    expect([2026, 2022, 2015].map(recencyWeight)).toEqual([1, 0.6, 0.3]);
  });

  it('gives expected points per average exam, splitting points primary 60 / others 40', () => {
    const weights = computeExamWeights(
      [
        { year: 2026, examId: 'a', maxPoints: 2, tag: st({ skills: ['A7', 'N2'] }) },
        { year: 2026, examId: 'b', maxPoints: 1, tag: st({}) },
        { year: 2026, examId: 'b', maxPoints: 4, tag: st({ offProgram: true }) },
      ],
      ['A7', 'N2', 'G4']
    );
    // A7: (2*0.6 + 1) / 2 exams = 1.1; N2: 2*0.4 / 2 = 0.4; G4 unseen gets the floor.
    expect(weights).toEqual({ A7: 1.1, N2: 0.4, G4: MIN_EXAM_WEIGHT });
  });
});
