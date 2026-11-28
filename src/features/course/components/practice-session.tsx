'use client';
import { CalendarCheck, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

import { LessonPlayer } from '@/features/course/components/lesson-player';
import { LessonReteach } from '@/features/course/components/lesson-sections';
import { PracticeCheckBar } from '@/features/course/components/practice-check-bar';
import { PracticeComplete } from '@/features/course/components/practice-complete';
import { ItemBanner, QuestionHelp } from '@/features/course/components/practice-item-help';
import { TheoryCard } from '@/features/course/components/theory-card';
import { WorkPhotoPanel } from '@/features/course/components/work-photo-panel';
import { usePractice } from '@/features/course/hooks/use-practice';
import { usePracticeStore } from '@/features/course/hooks/usePracticeStore';
import { stepHintCost } from '@/features/course/service/hints';
import { PracticeSessionView } from '@/features/course/types/course.types';
import { AnswerOptionTile } from '@/features/diagnostic/components/answer-option-tile';
import { SessionProgressBar } from '@/features/diagnostic/components/session-progress-bar';
import { answerXp } from '@/features/progress/service/progress-stats';
import { SolutionSteps } from '@/features/question/components/solution-steps';
import { TutorChat } from '@/features/tutor/components/tutor-chat';
import { SoundToggle } from '@/shared/components/layout/sound-toggle';
import { Button } from '@/shared/components/ui/button';
import { ExpandableSection } from '@/shared/components/ui/expandable-section';
import { MathText } from '@/shared/components/ui/math-text';
import { COURSE_COPY, PRACTICE_COPY } from '@/shared/const/course.const';
import { DIAGNOSTIC_COPY } from '@/shared/const/diagnostic.const';
import { LESSON_COPY } from '@/shared/const/lesson.const';
import { XP_RULES } from '@/shared/const/progress.const';
import { COURSE_ROUTE } from '@/shared/const/routes.const';

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
 * Daily session (T-020 + T-029 lesson rules): a full lesson first, then questions from easy to harder, one per
 * screen with instant feedback. A new skill's first questions are guided (solved together → one hint → alone).
 * Stuck → four stages (a hint → more detail → a photo of the working → easier questions first), never the answer.
 * Wrong → the solution, a simpler re-explanation, "find my mistake" from a photo, and a second-chance question.
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
      answeredItems.reduce(
        (sum, i) => sum + answerXp({ isQuestion: !!i.question, correct: i.correct, hintsUsed: i.hints.reduce((n, h) => n + stepHintCost(h), 0) }),
        0
      ) + (answeredItems.length === view.items.length ? XP_RULES.dayBonus : 0);
    return <PracticeComplete correctCount={result.correctCount} questionCount={result.questionCount} xp={xp} />;
  }

  const ids = view.items.map((_, i) => `item-${i}`);
  const answered = new Set(ids.filter((_, i) => view.items[i].answered));
  // Revisiting an answered step shows what was answered and its result (review mode, nothing is re-sent).
  const shown = feedback ?? (item.answered && item.question ? { correct: !!item.correct, correctAnswer: item.correctAnswer } : null);
  const chosen = item.answered ? item.answer : selected;
  const solution = feedback?.solution ?? item.solution;
  const reteach = feedback?.reteach ?? item.reteach;
  const isTheory = item.kind === 'theory' || !item.question;
  const allStagesShown = item.stuckStage >= item.stuckStages;

  const header = (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-6">
      <CloseButton />
      <SessionProgressBar total={ids.length} currentIndex={index} answeredIds={answered} questionIds={ids} label={PRACTICE_COPY.questionOf} />
      <SoundToggle />
    </div>
  );

  // Theory with a full lesson: the lesson player owns the screen and its bottom bar.
  if (isTheory && item.lesson) {
    return (
      <div className="flex min-h-screen flex-col">
        {header}
        <LessonPlayer
          key={item.index}
          lesson={item.lesson}
          skillName={item.skillName}
          prerequisiteNames={item.prerequisiteNames}
          reviewing={item.answered}
          busy={busy}
          error={error}
          onFinish={item.answered ? next : () => void gotIt()}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {header}

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <p className="text-sm font-extrabold text-sky">
          {COURSE_COPY.blockKinds[item.kind]}
          {item.skillName && ` · ${item.skillName}`}
        </p>

        {isTheory || !item.question ? (
          <TheoryCard skillName={item.skillName} prerequisiteNames={item.prerequisiteNames} theory={item.theory} mastery={item.mastery} />
        ) : (
          <div key={item.index} className="animate-rise flex flex-col gap-6">
            <ItemBanner item={item} />
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
            <QuestionHelp item={item} sessionId={view.id} answered={shown !== null} />
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
            {shown && !shown.correct && reteach && (
              <ExpandableSection title={LESSON_COPY.reteachButton} className="border-sky">
                <LessonReteach reteach={reteach} />
              </ExpandableSection>
            )}
            {shown && !shown.correct && view.id && (
              <WorkPhotoPanel
                key={`mistake-${item.index}`}
                sessionId={view.id}
                itemIndex={item.index}
                mode="mistake"
                feedback={item.workPhoto?.mode === 'mistake' ? item.workPhoto : null}
              />
            )}
            {shown && view.id && <TutorChat key={item.index} sessionId={view.id} itemIndex={item.index} />}
          </div>
        )}
      </main>

      <PracticeCheckBar
        item={item}
        shown={shown}
        canGoBack={index > 0}
        canAskForHelp={!shown && !isTheory && !allStagesShown}
        levelUp={!!feedback?.levelUp}
        isTheory={isTheory}
        selected={selected}
        busy={busy}
        error={error}
        onBack={back}
        onHint={() => void requestHint()}
        onCheck={() => void check()}
        onGotIt={() => void gotIt()}
        onNext={next}
      />
    </div>
  );
};
