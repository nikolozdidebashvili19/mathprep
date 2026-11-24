/**
 * T-010: pure mapping from content/ files to MongoDB documents (no DB access here, so it's unit-tested).
 */
import type { ExamIndexEntry } from '../extract/content-index';
import type { Explanation } from '../extract/explanation';
import type { QuestionImport } from '../extract/question-import';
import type { SkillTag } from '../extract/skill-tag';

/** Exam formats seen in the papers (T-006/T-008): question count + points layout. */
export const FORMAT_ERAS = {
  E2015: 'e2015', // 2015–2020: 40 questions (30 MC + 10 written), 59 points
  E2021: 'e2021', // 2021–2022: 35 questions (27 MC + 8 written), 51 points
  E2023: 'e2023', // 2023+:     41 questions (37 MC + 4 written), 51 points
} as const;

/** The newest papers are reserved for the diagnostic and the final mock (T-007 ticket). */
export const DIAGNOSTIC_YEARS = [2024, 2025, 2026];

/** Placeholder until AI skill tagging (T-009) estimates difficulty. */
export const UNTAGGED_DIFFICULTY = 3;

export function formatEraForYear(year: number): string {
  if (year >= 2023) return FORMAT_ERAS.E2023;
  if (year >= 2021) return FORMAT_ERAS.E2021;
  return FORMAT_ERAS.E2015;
}

export type SkillFile = {
  skills: {
    code: string;
    topic: string;
    nameKa: string;
    nameEn: string;
    examWeight: number;
    minPracticeMinutes: number;
    prerequisites: string[];
  }[];
};

export function mapSkills(file: SkillFile) {
  return file.skills.map((s) => ({
    code: s.code,
    topic: s.topic,
    nameKa: s.nameKa,
    nameEn: s.nameEn,
    examWeight: s.examWeight,
    minPracticeMinutes: s.minPracticeMinutes,
    prerequisites: s.prerequisites,
  }));
}

export function mapExam(entry: ExamIndexEntry) {
  return {
    code: entry.id,
    year: entry.year,
    variant: entry.variant,
    formatEra: formatEraForYear(entry.year),
    sourceFile: entry.examFile,
    answerKeyFile: entry.answerKeyFile,
    pageCount: entry.examPageCount,
    usableForDiagnostic: DIAGNOSTIC_YEARS.includes(entry.year),
  };
}

/** Splits a question into fields refreshed on every seed vs. fields an admin may edit after the first insert. */
export function mapQuestion(q: QuestionImport, examObjectId: string, year: number) {
  const always = {
    examId: examObjectId,
    number: q.number,
    source: 'naec' as const,
    sourcePage: q.sourcePage,
    formatEra: formatEraForYear(year),
    type: q.type,
    maxPoints: q.maxPoints,
  };
  const onInsert = {
    text: q.text,
    options: q.options,
    answer: q.answer,
    images: q.images,
    difficulty: UNTAGGED_DIFFICULTY,
    status: 'draft' as const,
  };
  return { always, onInsert };
}

/** Verified explanation → question fields (shown to students only after they answer). */
export function mapExplanation(e: Explanation) {
  return { solutionSteps: e.steps, commonMistakes: e.commonMistake ? [e.commonMistake] : [] };
}

/** T-009 suggestion → question fields. Applied to `draft` questions only; approval happens in admin review (T-011). */
export function mapTag(tag: SkillTag) {
  return {
    skills: tag.skills.map((skillCode) => ({ skillCode, isPrimary: skillCode === tag.primarySkill })),
    primarySkill: tag.primarySkill ?? undefined,
    difficulty: tag.difficulty,
    offProgram: tag.offProgram,
  };
}
