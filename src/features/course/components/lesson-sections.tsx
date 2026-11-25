'use client';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { Check, CircleHelp, Sigma, X } from 'lucide-react';
import { useState } from 'react';

import { LessonView } from '@/features/course/types/course.types';
import { AnswerOptionTile } from '@/features/diagnostic/components/answer-option-tile';
import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { LESSON_COPY } from '@/shared/const/lesson.const';
import { sound } from '@/shared/lib/sound';
import { cn } from '@/shared/lib/utils';

type Section = LessonView['sections'][number];
type ExplainSection = Extract<Section, { type: 'explain' }>;
type ExampleSection = Extract<Section, { type: 'example' }>;
type CheckSection = Extract<Section, { type: 'check' }>;
type Formula = ExplainSection['formulas'][number];
type Example = LessonView['reteach']['example'];

/** A display formula on its own line (pure LaTeX, KaTeX display mode). Content is reviewed lesson text. */
const DisplayMath = ({ tex }: { tex: string }) => (
  <div
    className="overflow-x-auto py-1 text-lg"
    dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: true, throwOnError: false, trust: false }) }}
  />
);

export const FormulaBox = ({ formula }: { formula: Formula }) => (
  <div className="flex flex-col gap-2 rounded-2xl border-2 border-sky bg-sky/5 p-4">
    <p className="flex items-center gap-2 text-sm font-extrabold text-sky">
      <Sigma className="size-4" />
      <MathText text={formula.name} />
    </p>
    <DisplayMath tex={formula.tex} />
    <p className="text-sm font-semibold">
      <span className="font-extrabold">{LESSON_COPY.formulaWhen}</span> <MathText text={formula.when} />
    </p>
    <p className="text-sm font-semibold">
      <span className="font-extrabold">{LESSON_COPY.formulaHow}</span> <MathText text={formula.how} />
    </p>
  </div>
);

export const ExplainBlock = ({ section }: { section: ExplainSection }) => (
  <div className="flex flex-col gap-4">
    <h2 className="text-xl">
      <MathText text={section.title} />
    </h2>
    {section.paragraphs.map((p) => (
      <p key={p} className="text-base font-semibold leading-relaxed">
        <MathText text={p} />
      </p>
    ))}
    {section.formulas.map((f) => (
      <FormulaBox key={f.tex} formula={f} />
    ))}
  </div>
);

/** A worked example: each step says what to do, and "why?" opens the reasoning behind it. */
export const WorkedExample = ({ example, title }: { example: Example; title: string }) => (
  <div className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-4">
    <p className="text-sm font-extrabold text-primary">{title}</p>
    <p className="text-lg font-bold">
      <MathText text={example.problem} />
    </p>
    <ol className="flex flex-col gap-3">
      {example.steps.map((step, i) => (
        <li key={step.do} className="flex gap-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sky/15 text-sm font-extrabold text-sky">{i + 1}</span>
          <div className="flex flex-1 flex-col gap-1">
            <p className="font-semibold">
              <MathText text={step.do} />
            </p>
            <details className="group">
              <summary
                className={cn(
                  'flex w-fit cursor-pointer list-none items-center gap-1 rounded-lg text-sm font-extrabold text-sky',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky'
                )}
              >
                <CircleHelp className="size-4" />
                {LESSON_COPY.why}
              </summary>
              <p className="mt-1 rounded-xl bg-sky/5 px-3 py-2 text-sm font-semibold">
                <MathText text={step.why} />
              </p>
            </details>
          </div>
        </li>
      ))}
    </ol>
    <p className="rounded-xl bg-primary/10 px-3 py-2 font-extrabold text-primary">
      {LESSON_COPY.answer}: <MathText text={example.answer} />
    </p>
  </div>
);

export const ExampleBlock = ({ section }: { section: ExampleSection }) => (
  <WorkedExample example={section} title={LESSON_COPY.exampleLevels[section.level]} />
);

/**
 * A small check inside the lesson: no score, no mastery. Wrong → the explanation and another try.
 * `onAnswered` fires after the first check so the lesson can let the student move on.
 */
export const CheckBlock = ({ section, onAnswered }: { section: CheckSection; onAnswered?: () => void }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  const check = () => {
    if (!selected) return;
    const correct = selected === section.answer;
    sound.play(correct ? 'correct' : 'wrong');
    setResult(correct ? 'correct' : 'wrong');
    onAnswered?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-extrabold text-xp">{LESSON_COPY.checkTitle}</p>
      <p className="text-lg font-bold">
        <MathText text={section.question} />
      </p>
      <div role="radiogroup" aria-label={LESSON_COPY.checkTitle} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {section.options.map((o) => (
          <AnswerOptionTile
            key={o.key}
            optionKey={o.key}
            text={o.text}
            selected={selected === o.key}
            disabled={result === 'correct'}
            onSelect={() => {
              setSelected(o.key);
              if (result === 'wrong') setResult(null);
            }}
          />
        ))}
      </div>
      {result ? (
        <div
          className={cn(
            'animate-pop flex flex-col gap-2 rounded-2xl border-2 p-4',
            result === 'correct' ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10'
          )}
        >
          <p className={cn('flex items-center gap-2 font-extrabold', result === 'correct' ? 'text-primary' : 'text-destructive')}>
            {result === 'correct' ? <Check className="size-5" /> : <X className="size-5" />}
            {result === 'correct' ? LESSON_COPY.checkCorrect : LESSON_COPY.checkWrong}
          </p>
          <p className="text-sm font-semibold">
            <MathText text={section.explanation} />
          </p>
          {result === 'wrong' && <p className="text-sm font-extrabold text-muted-foreground">{LESSON_COPY.tryAgain}</p>}
        </div>
      ) : (
        <Button type="button" variant="sky" className="self-start" onClick={check} disabled={!selected}>
          {LESSON_COPY.check}
        </Button>
      )}
    </div>
  );
};

export const LessonSectionBlock = ({ section, onAnswered }: { section: Section; onAnswered?: () => void }) => {
  if (section.type === 'explain') return <ExplainBlock section={section} />;
  if (section.type === 'example') return <ExampleBlock section={section} />;
  return <CheckBlock section={section} onAnswered={onAnswered} />;
};

/** Summary screen: the key points, typical mistakes and the exam tip. */
export const LessonSummary = ({ lesson }: { lesson: LessonView }) => (
  <div className="flex flex-col gap-4">
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-primary bg-primary/5 p-4">
      <h2 className="text-lg text-primary">{LESSON_COPY.summaryTitle}</h2>
      <ul className="flex flex-col gap-2">
        {lesson.summary.map((s) => (
          <li key={s} className="flex gap-2 font-semibold">
            <Check className="mt-1 size-4 shrink-0 text-primary" />
            <span>
              <MathText text={s} />
            </span>
          </li>
        ))}
      </ul>
    </section>
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-streak/40 bg-streak/5 p-4">
      <h2 className="text-lg text-streak">{LESSON_COPY.mistakesTitle}</h2>
      <ul className="flex flex-col gap-1.5">
        {lesson.mistakes.map((m) => (
          <li key={m} className="text-sm font-semibold">
            • <MathText text={m} />
          </li>
        ))}
      </ul>
    </section>
    <p className="rounded-2xl bg-xp/10 p-4 text-sm font-bold">
      {LESSON_COPY.tipTitle}: <MathText text={lesson.examTip} />
    </p>
  </div>
);

/** The simpler second explanation, shown after a wrong answer on this skill. */
export const LessonReteach = ({ reteach }: { reteach: LessonView['reteach'] }) => (
  <div className="flex flex-col gap-4 rounded-2xl border-2 border-sky bg-sky/5 p-4">
    <h3 className="text-lg text-sky">{LESSON_COPY.reteachTitle}</h3>
    {reteach.paragraphs.map((p) => (
      <p key={p} className="font-semibold leading-relaxed">
        <MathText text={p} />
      </p>
    ))}
    <WorkedExample example={reteach.example} title={LESSON_COPY.exampleLevels.easy} />
  </div>
);
