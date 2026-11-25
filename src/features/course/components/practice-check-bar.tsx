'use client';
import { ArrowLeft, Check, HandHelping, X } from 'lucide-react';

import { PracticeItemView } from '@/features/course/types/course.types';
import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { HINT_COPY, PRACTICE_COPY } from '@/shared/const/course.const';
import { cn } from '@/shared/lib/utils';

type PracticeCheckBarProps = {
  item: PracticeItemView;
  /** The result being shown (just checked, or a revisited answered item), or null before checking. */
  shown: { correct: boolean; correctAnswer: string | null } | null;
  canGoBack: boolean;
  canAskForHelp: boolean;
  isTheory: boolean;
  selected: string | null;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onHint: () => void;
  onCheck: () => void;
  onGotIt: () => void;
  onNext: () => void;
};

/** Sticky bottom bar (T-029): back, "I'm stuck", then check → green "correct" or red with the right answer → continue. */
export const PracticeCheckBar = ({
  item,
  shown,
  canGoBack,
  canAskForHelp,
  isTheory,
  selected,
  busy,
  error,
  onBack,
  onHint,
  onCheck,
  onGotIt,
  onNext,
}: PracticeCheckBarProps) => (
  <div
    className={cn(
      'sticky bottom-0 border-t-2',
      shown ? (shown.correct ? 'border-primary bg-primary/10' : 'border-destructive bg-destructive/10') : 'bg-background'
    )}
  >
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {canGoBack && (
          <Button type="button" variant="ghost" size="icon" aria-label={PRACTICE_COPY.back} onClick={onBack} disabled={busy}>
            <ArrowLeft className="size-5" />
          </Button>
        )}
        {canAskForHelp && (
          <Button type="button" variant="outline" onClick={onHint} disabled={busy}>
            <HandHelping className="size-4 text-xp" />
            {item.hints.length === 0 ? HINT_COPY.button : HINT_COPY.more}
          </Button>
        )}
        {shown && (
          <div className={cn('animate-pop flex items-center gap-3', shown.correct ? 'text-primary' : 'text-destructive')}>
            <span className={cn('inline-flex size-10 items-center justify-center rounded-full text-white', shown.correct ? 'bg-primary' : 'bg-destructive')}>
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
        )}
      </div>
      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      {isTheory && item.answered ? (
        <Button size="lg" onClick={onNext}>
          {PRACTICE_COPY.continue}
        </Button>
      ) : isTheory ? (
        <Button size="lg" onClick={onGotIt} disabled={busy}>
          {busy ? PRACTICE_COPY.saving : PRACTICE_COPY.gotIt}
        </Button>
      ) : shown ? (
        <Button size="lg" variant={shown.correct ? 'default' : 'destructive'} onClick={onNext}>
          {PRACTICE_COPY.continue}
        </Button>
      ) : (
        <Button size="lg" onClick={onCheck} disabled={!selected || busy}>
          {busy ? PRACTICE_COPY.saving : PRACTICE_COPY.check}
        </Button>
      )}
    </div>
  </div>
);
