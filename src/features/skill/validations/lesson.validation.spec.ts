import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import katex from 'katex';
import { describe, expect, it } from 'vitest';

import { LessonExampleType, LessonSchema, LessonType } from '@/features/skill/validations/lesson.validation';
import { splitMathSegments } from '@/shared/utils/math-text';

const LESSON_DIR = path.resolve(process.cwd(), 'content/lessons');
const files = readdirSync(LESSON_DIR).filter((f) => f.endsWith('.json'));
const skillCodes = new Set<string>(
  JSON.parse(readFileSync(path.resolve(process.cwd(), 'content/skills.json'), 'utf8')).skills.map((s: { code: string }) => s.code)
);

const exampleText = (e: LessonExampleType) => [e.problem, e.answer, ...e.steps.flatMap((s) => [s.do, s.why])];

/** Every string in a lesson that is rendered with MathText, plus the display formulas (rendered as pure LaTeX). */
function lessonText(lesson: LessonType): { prose: string[]; formulas: string[] } {
  const prose: string[] = [lesson.goal, ...lesson.summary, ...lesson.mistakes, lesson.examTip, ...lesson.reteach.paragraphs, ...exampleText(lesson.reteach.example)];
  const formulas: string[] = [];
  for (const s of lesson.sections) {
    if (s.type === 'explain') {
      prose.push(s.title, ...s.paragraphs, ...s.formulas.flatMap((f) => [f.name, f.when, f.how]));
      formulas.push(...s.formulas.map((f) => f.tex));
    } else if (s.type === 'example') prose.push(...exampleText(s));
    else prose.push(s.question, s.explanation, ...s.options.map((o) => o.text));
  }
  return { prose, formulas };
}

describe('content/lessons', () => {
  it('exist', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s is a valid lesson for a real skill, and all maths renders in KaTeX', (file) => {
    const parsed = LessonSchema.safeParse(JSON.parse(readFileSync(path.join(LESSON_DIR, file), 'utf8')));
    expect(parsed.error?.issues ?? []).toEqual([]);
    const lesson = parsed.data!;
    expect(`${lesson.code}.json`).toBe(file);
    expect(skillCodes.has(lesson.code)).toBe(true);

    const { prose, formulas } = lessonText(lesson);
    for (const text of [...prose, ...formulas]) {
      // A control character means a broken escape (e.g. "\t" in "\text" became a tab).
      expect(/[\u0000-\u001f]/.test(text), JSON.stringify(text)).toBe(false);
    }
    for (const text of prose) {
      expect((text.match(/\$/g) ?? []).length % 2, `unbalanced $ in: ${text}`).toBe(0);
      for (const segment of splitMathSegments(text).filter((s) => s.kind === 'math')) {
        expect(() => katex.renderToString(segment.value, { throwOnError: true }), segment.value).not.toThrow();
      }
    }
    for (const tex of formulas) expect(() => katex.renderToString(tex, { throwOnError: true }), tex).not.toThrow();
  });
});

describe('LessonSchema rules', () => {
  const base = JSON.parse(readFileSync(path.join(LESSON_DIR, files[0]), 'utf8'));

  it('rejects examples out of easy → medium → hard order', () => {
    const sections = base.sections.map((s: { type: string; level?: string }) =>
      s.type === 'example' && s.level === 'easy' ? { ...s, level: 'hard' } : s.type === 'example' && s.level === 'hard' ? { ...s, level: 'easy' } : s
    );
    expect(LessonSchema.safeParse({ ...base, sections }).success).toBe(false);
  });

  it('rejects a check whose answer is not one of its options', () => {
    const sections = base.sections.map((s: { type: string }) => (s.type === 'check' ? { ...s, answer: 'e' } : s));
    expect(LessonSchema.safeParse({ ...base, sections }).success).toBe(false);
  });
});
