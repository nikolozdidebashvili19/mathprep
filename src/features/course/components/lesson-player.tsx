'use client';
import { ArrowLeft, BookOpen, Clock } from 'lucide-react';
import { useState } from 'react';

import { LessonSectionBlock, LessonSummary } from '@/features/course/components/lesson-sections';
import { LessonView } from '@/features/course/types/course.types';
import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { SegmentedBar } from '@/shared/components/ui/segmented-bar';
import { PRACTICE_COPY } from '@/shared/const/course.const';
import { LESSON_COPY } from '@/shared/const/lesson.const';

type LessonPlayerProps = {
  lesson: LessonView;
  skillName: string | null;
  prerequisiteNames: string[];
  /** Already read earlier (reviewing a past day): the last button just moves on. */
  reviewing: boolean;
  busy: boolean;
  error: string | null;
  onFinish: () => void;
};

/**
 * The theory phase as a real lesson: an intro with the goal, then one screen per section (explanations with
 * formula boxes, examples easy → hard, small checks in between), then the summary. A check screen lets the student
 * continue only after trying it. Finishing marks the theory step read and the practice questions begin.
 */
export const LessonPlayer = ({ lesson, skillName, prerequisiteNames, reviewing, busy, error, onFinish }: LessonPlayerProps) => {
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState<ReadonlySet<number>>(new Set());
  const screens = lesson.sections.length + 2; // intro + sections + summary
  const section = step > 0 && step <= lesson.sections.length ? lesson.sections[step - 1] : null;
  const blocked = section?.type === 'check' && !tried.has(step) && !reviewing;
  const last = step === screens - 1;

  return (
    <>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-center gap-3">
          <SegmentedBar ratio={(step + 1) / screens} segments={screens} fillClassName="bg-sky" label={skillName ?? ''} className="h-2.5" />
          <span className="shrink-0 text-xs font-extrabold text-muted-foreground">{LESSON_COPY.stepOf(step + 1, screens)}</span>
        </div>

        <div key={step} className="animate-rise flex flex-col gap-6">
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky text-sky-foreground shadow-edge-sky">
                  <BookOpen className="size-6" />
                </span>
                <div className="flex flex-col">
                  <p className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
                    <Clock className="size-4" />
                    {LESSON_COPY.minutes(lesson.minutes)}
                  </p>
                  <h1 className="text-2xl">{skillName}</h1>
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
                <p className="text-sm font-extrabold text-sky">{LESSON_COPY.goalTitle}</p>
                <p className="font-semibold leading-relaxed">
                  <MathText text={lesson.goal} />
                </p>
              </div>
              {prerequisiteNames.length > 0 && (
                <p className="text-sm font-semibold text-muted-foreground">
                  {PRACTICE_COPY.theoryNeeds} {prerequisiteNames.join(', ')}
                </p>
              )}
            </div>
          )}
          {section && <LessonSectionBlock section={section} onAnswered={() => setTried((t) => new Set(t).add(step))} />}
          {last && <LessonSummary lesson={lesson} />}
        </div>
      </main>

      <div className="sticky bottom-0 border-t-2 bg-background">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              <ArrowLeft className="size-5" />
              {LESSON_COPY.back}
            </Button>
          ) : (
            <span />
          )}
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          {last ? (
            <Button size="lg" onClick={onFinish} disabled={busy}>
              {busy ? PRACTICE_COPY.saving : reviewing ? LESSON_COPY.finishReview : LESSON_COPY.finish}
            </Button>
          ) : (
            <Button size="lg" variant={step === 0 ? 'default' : 'sky'} onClick={() => setStep((s) => s + 1)} disabled={blocked}>
              {step === 0 ? LESSON_COPY.start : LESSON_COPY.next}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
