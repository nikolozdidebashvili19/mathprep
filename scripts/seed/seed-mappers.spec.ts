import { describe, expect, it } from 'vitest';

import { formatEraForYear, mapExam, mapQuestion, mapSkills, mapTag, UNTAGGED_DIFFICULTY } from './seed-mappers';

import type { ExamIndexEntry } from '../extract/content-index';
import type { QuestionImport } from '../extract/question-import';

const entry: ExamIndexEntry = {
  id: '2025-V1',
  year: 2025,
  variant: 1,
  variantVerified: true,
  examFile: '2025/exam.pdf',
  examPageCount: 43,
  answerKeyFile: '2025/answers.pdf',
  answerKeyPageCount: 5,
  answerKeyInExamFile: false,
  questions: [],
};

const question: QuestionImport = {
  code: '2025-V1-Q04',
  examId: '2025-V1',
  number: 4,
  sourcePage: 5,
  type: 'multiple_choice',
  maxPoints: 1,
  text: 'იპოვეთ $x$',
  options: [{ key: 'ა', text: '$1$' }],
  answer: 'ა',
  images: [],
  extraction: { provider: 'gemini', model: 'm', confidence: 1, notes: '', problems: [] },
};

describe('formatEraForYear', () => {
  it.each([
    [2015, 'e2015'],
    [2020, 'e2015'],
    [2021, 'e2021'],
    [2022, 'e2021'],
    [2023, 'e2023'],
    [2026, 'e2023'],
  ])('%i → %s', (year, era) => {
    expect(formatEraForYear(year)).toBe(era);
  });
});

describe('mapExam', () => {
  it('maps index fields and marks recent papers for the diagnostic', () => {
    expect(mapExam(entry)).toEqual({
      code: '2025-V1',
      year: 2025,
      variant: 1,
      formatEra: 'e2023',
      sourceFile: '2025/exam.pdf',
      answerKeyFile: '2025/answers.pdf',
      pageCount: 43,
      usableForDiagnostic: true,
    });
    expect(mapExam({ ...entry, year: 2019 }).usableForDiagnostic).toBe(false);
  });
});

describe('mapQuestion', () => {
  it('keeps editable content out of the always-refreshed fields', () => {
    const { always, onInsert } = mapQuestion(question, '507f1f77bcf86cd799439011', 2025);
    expect(always).toEqual({
      examId: '507f1f77bcf86cd799439011',
      number: 4,
      source: 'naec',
      sourcePage: 5,
      formatEra: 'e2023',
      type: 'multiple_choice',
      maxPoints: 1,
    });
    expect(onInsert).toMatchObject({ text: question.text, answer: 'ა', status: 'draft', difficulty: UNTAGGED_DIFFICULTY });
    expect(Object.keys(always)).not.toContain('text');
  });
});

describe('mapSkills', () => {
  it('passes skill fields through', () => {
    const skill = { code: 'N1', topic: 'N', nameKa: 'ა', nameEn: 'a', examWeight: 1, minPracticeMinutes: 60, prerequisites: [] };
    expect(mapSkills({ skills: [skill] })).toEqual([skill]);
  });
});

describe('mapTag', () => {
  it('marks the primary skill and copies difficulty / off-program', () => {
    const tag = {
      code: '2025-V1-Q01', skills: ['A7', 'N2'], primarySkill: 'A7', difficulty: 4, offProgram: false,
      confidence: 0.9, notes: '', problems: [], provider: 'gemini', model: 'm',
    };
    expect(mapTag(tag)).toEqual({
      skills: [{ skillCode: 'A7', isPrimary: true }, { skillCode: 'N2', isPrimary: false }],
      primarySkill: 'A7',
      difficulty: 4,
      offProgram: false,
    });
  });
});
