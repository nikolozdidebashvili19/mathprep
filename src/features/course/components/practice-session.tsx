'use client';
import { ArrowLeft, CalendarCheck, Check, Lightbulb, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

import { HintList } from '@/features/course/components/hint-list';
import { PracticeComplete } from '@/features/course/components/practice-complete';
import { TheoryCard } from '@/features/course/components/theory-card';
import { usePractice } from '@/features/course/hooks/use-practice';
import { usePracticeStore } from '@/features/course/hooks/usePracticeStore';
import { PracticeSessionView } from '@/features/course/types/course.types';
import { AnswerOptionTile } from '@/features/diagnostic/components/answer-option-tile';
import { SessionProgressBar } from '@/features/diagnostic/components/session-progress-bar';
import { answerXp } from '@/features/progress/service/progress-stats';
import { SolutionSteps } from '@/features/question/components/solution-steps';
import { TutorChat } from '@/features/tutor/components/tutor-chat';
import { SoundToggle } from '@/shared/components/layout/sound-toggle';
import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { COURSE_COPY, HINT_COPY, PRACTICE_COPY } from '@/shared/const/course.const';
import { DIAGNOSTIC_COPY } from '@/shared/const/diagnostic.const';
import { XP_RULES } from '@/shared/const/progress.const';
import { COURSE_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';

type PracticeSessionProps = {
  initialView: PracticeSessionView;
};

const CloseButton = () => (
  <Button asChild variant="ghost" size="icon" aria-label={PRACTICE_COPY.close}>
    <Link href={COURSE_ROUTE}>
      <X className="size-6 text-muted-foreground" />
    </Link>
  </Button>
);

/**
 * Daily session (T-020 + T-029 lesson rules): one step per screen, instant feedback after "check"
 * (green "correct" bar, or red with the right answer), then "continue". Every answer updates mastery.
 */
export const PracticeSession = ({ initialView }: PracticeSessionProps) => {
  const { view, index, selected, feedback, busy, error, summary, startPractice, select } = usePracticeStore();
  const { check, gotIt, next, back, requestHint } = usePractice();

  useEffect(() => {
    startPractice(initialView);
  }, [initialView, startPractice]);

  if (!view || view.dayIndex !== initialView.dayIndex || view.id !== initialView.id) return null;

  if (view.checkDay) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
        <CalendarCheck className="size-14 text-xp" />
        <h1 className="text-2xl">{PRACTICE_COPY.checkDayTitle}</h1>
        <p className="font-semibold text-muted-foreground">{PRACTICE_COPY.checkDayBody}</p>
        <Button asChild size="lg">
          <Link href={COURSE_ROUTE}>{PRACTICE_COPY.toCourse}</Link>
        </Button>
      </div>
    );
  }

  const item = view.items[index];
  if (!item) {
    const questions = view.items.filter((i) => i.question);
    const result = summary ?? { correctCount: questions.filter((i) => i.correct).length, questionCount: questions.length };
    const answeredItems = view.items.filter((i) => i.answered);
    const xp =
      answeredItems.reduce((sum, i) => sum + answerXp({ isQuestion: !!i.question, correct: i.correct, hintsUsed: i.hints.length }), 0) +
      (answeredItems.length === view.items.length ? XP_RULES.dayBonus : 0);
    return <PracticeComplete correctCount={result.correctCount} questionCount={result.questionCount} xp={xp} />;
  }

  const ids = view.items.map((_, i) => `item-${i}`);
  const answered = new Set(ids.filter((_, i) => view.items[i].answered));
  // Revisiting an answered step shows what was answered and its result (review mode, nothing is re-sent).
  const shown = feedback ?? (item.answered && item.question ? { correct: !!item.correct, correctAnswer: item.correctAnswer } : null);
  const chosen = item.answered ? item.answer : selected;
  const solution = feedback?.solution ?? item.solution;
  const isTheory = item.kind === 'theory' || !item.question;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-6">
        <CloseButton />
        <SessionProgressBar total={ids.length} currentIndex={index} answeredIds={answered} questionIds={ids} label={PRACTICE_COPY.questionOf} />
        <SoundToggle />
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <p className="text-sm font-extrabold text-sky">
          {COURSE_COPY.blockKinds[item.kind]}
          {item.skillName && ` · ${item.skillName}`}
        </p>

        {isTheory || !item.question ? (
          <TheoryCard skillName={item.skillName} prerequisiteNames={item.prerequisiteNames} theory={item.theory} mastery={item.mastery} />
        ) : (
          <div key={item.index} className="animate-rise flex flex-col gap-6">
            <h1 className="text-lg font-bold sm:text-xl">
              <MathText text={item.question.text} />
            </h1>
            {item.question.imageUrls.map((url) => (
              <Image
                key={url}
                src={url}
                alt={DIAGNOSTIC_COPY.figureAlt}
                width={1200}
                height={600}
                unoptimized
                className="h-auto max-h-96 w-full rounded-2xl border-2 bg-white object-contain p-2"
              />
            ))}
            <HintList hints={item.hints} total={item.hintsTotal} />
            <div role="radiogroup" aria-label={DIAGNOSTIC_COPY.chooseAnswer} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {item.question.options.map((option) => (
                <AnswerOptionTile
                  key={option.key}
                  optionKey={option.key}
                  text={option.text}
                  selected={chosen === option.key}
                  disabled={busy || shown !== null}
                  onSelect={() => select(option.key)}
                />
              ))}
            </div>
            {shown && solution && <SolutionSteps steps={solution.steps} commonMistake={solution.commonMistake} open={!shown.correct} />}
            {shown && view.id && <TutorChat key={item.index} sessionId={view.id} itemIndex={item.index} />}
          </div>
        )}
      </main>

      <div
        className={cn(
          'sticky bottom-0 border-t-2',
          shown ? (shown.correct ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10') : 'bg-background'
        )}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {index > 0 && (
              <Button type="button" variant="ghost" size="icon" aria-label={PRACTICE_COPY.back} onClick={back} disabled={busy}>
                <ArrowLeft className="size-5" />
              </Button>
            )}
            {!shown && !isTheory && item.hints.length < item.hintsTotal && (
              <Button type="button" variant="outline" onClick={() => void requestHint()} disabled={busy}>
                <Lightbulb className="size-4 text-xp" />
                {HINT_COPY.button}
              </Button>
            )}
            {shown ? (
              <div className={cn('animate-pop flex items-center gap-3', shown.correct ? 'text-primary' : 'text-destructive')}>
                <span
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded-full text-white',
                    shown.correct ? 'bg-primary' : 'bg-destructive'
                  )}
                >
                  {shown.correct ? <Check className="size-6" /> : <X className="size-6" />}
                </span>
                <div className="flex flex-col">
                  <span className="text-lg font-extrabold">{shown.correct ? PRACTICE_COPY.correct : PRACTICE_COPY.wrong}</span>
                  {!shown.correct && shown.correctAnswer && (
                    <span className="text-sm font-bold">
                      {PRACTICE_COPY.correctAnswerIs} {shown.correctAnswer}){' '}
                      <MathText text={item.question?.options.find((o) => o.key === shown.correctAnswer)?.text ?? ''} />
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span />
            )}
          </div>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          {isTheory && item.answered ? (
            <Button size="lg" onClick={next}>
              {PRACTICE_COPY.continue}
            </Button>
          ) : isTheory ? (
            <Button size="lg" onClick={() => void gotIt()} disabled={busy}>
              {busy ? PRACTICE_COPY.saving : PRACTICE_COPY.gotIt}
            </Button>
          ) : shown ? (
            <Button size="lg" variant={shown.correct ? 'default' : 'destructive'} onClick={next}>
              {PRACTICE_COPY.continue}
            </Button>
          ) : (
            <Button size="lg" onClick={() => void check()} disabled={!selected || busy}>
              {busy ? PRACTICE_COPY.saving : PRACTICE_COPY.check}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
