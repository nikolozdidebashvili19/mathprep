import { z } from 'zod';

import { CONTENT_STATUSES } from '@/shared/const/domain.const';
import { EXAMPLE_LEVELS, LESSON_MAX_MINUTES, LESSON_MIN_CHECKS, LESSON_MIN_MINUTES } from '@/shared/const/lesson.const';

const text = z.string().min(1);

/** A formula shown on its own line, with when to reach for it and how to apply it. */
export const LessonFormulaSchema = z.object({ tex: text, name: text, when: text, how: text });

/** One step of a worked example: what to do, and why it is the right move. */
export const LessonStepSchema = z.object({ do: text, why: text });

export const LessonExampleSchema = z.object({
  problem: text,
  steps: z.array(LessonStepSchema).min(1),
  answer: text,
});

const ExplainSectionSchema = z.object({
  type: z.literal('explain'),
  title: text,
  paragraphs: z.array(text).min(1),
  formulas: z.array(LessonFormulaSchema).default([]),
});

const ExampleSectionSchema = LessonExampleSchema.extend({ type: z.literal('example'), level: z.enum(EXAMPLE_LEVELS) });

/** A small check question inside the lesson: no mastery effect, the explanation is shown after any answer. */
const CheckSectionSchema = z
  .object({
    type: z.literal('check'),
    question: text,
    options: z.array(z.object({ key: z.string().regex(/^[a-e]$/), text })).min(2).max(5),
    answer: z.string().regex(/^[a-e]$/),
    explanation: text,
  })
  .refine((c) => c.options.some((o) => o.key === c.answer), { message: 'check answer must be one of its options' });

export const LessonSectionSchema = z.discriminatedUnion('type', [ExplainSectionSchema, ExampleSectionSchema, CheckSectionSchema]);

/**
 * A full lesson per skill (content/lessons/<code>.json): 10–15 minutes of step-by-step teaching. Original Georgian
 * text, maths in $...$. Explanations come first, three worked examples climb from easy to hard, small checks sit in
 * between, and `reteach` is the simpler second explanation shown when a student gets a question wrong.
 */
export const LessonSchema = z
  .object({
    code: z.string().regex(/^[A-Z][0-9]{1,2}$/),
    status: z.enum(CONTENT_STATUSES),
    minutes: z.number().int().min(LESSON_MIN_MINUTES).max(LESSON_MAX_MINUTES),
    goal: text,
    sections: z.array(LessonSectionSchema).min(6),
    summary: z.array(text).min(2),
    mistakes: z.array(text).min(1),
    examTip: text,
    reteach: z.object({ paragraphs: z.array(text).min(1), example: LessonExampleSchema }),
  })
  .superRefine((lesson, ctx) => {
    if (lesson.sections[0]?.type !== 'explain') ctx.addIssue({ code: 'custom', message: 'a lesson starts by explaining' });
    const levels = lesson.sections.flatMap((s) => (s.type === 'example' ? [s.level] : []));
    if (levels.join(',') !== EXAMPLE_LEVELS.join(',')) {
      ctx.addIssue({ code: 'custom', message: `examples must be exactly ${EXAMPLE_LEVELS.join(' → ')}, got ${levels.join(' → ')}` });
    }
    if (lesson.sections.filter((s) => s.type === 'check').length < LESSON_MIN_CHECKS) {
      ctx.addIssue({ code: 'custom', message: `at least ${LESSON_MIN_CHECKS} check questions` });
    }
    if (!lesson.sections.some((s) => s.type === 'explain' && s.formulas.length > 0)) {
      ctx.addIssue({ code: 'custom', message: 'at least one formula/rule box' });
    }
  });

export type LessonType = z.infer<typeof LessonSchema>;
export type LessonSectionType = z.infer<typeof LessonSectionSchema>;
export type LessonExampleType = z.infer<typeof LessonExampleSchema>;
