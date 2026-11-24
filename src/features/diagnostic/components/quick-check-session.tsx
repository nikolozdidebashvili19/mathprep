'use client';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

import { AnswerOptionTile } from '@/features/diagnostic/components/answer-option-tile';
import { QuickCheckComplete } from '@/features/diagnostic/components/quick-check-complete';
import { SessionProgressBar } from '@/features/diagnostic/components/session-progress-bar';
import { WorkPhotoStep } from '@/features/diagnostic/components/work-photo-step';
import { useQuickCheck } from '@/features/diagnostic/hooks/use-quick-check';
import { useQuickCheckStore } from '@/features/diagnostic/hooks/useQuickCheckStore';
import { QuickCheckView } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { DIAGNOSTIC_COPY, QUICK_CHECK_COPY } from '@/shared/const/diagnostic.const';
import { DIAGNOSTIC_ROUTE } from '@/shared/const/routes.const';

type QuickCheckSessionProps = {
  initialView: QuickCheckView;
};

/**
 * Adaptive quick check (T-012 + T-029 session rules). Per question: choose an option → photograph the working →
 * send. Answers are final (the next question depends on them), so there is no back button between questions.
 */
export const QuickCheckSession = ({ initialView }: QuickCheckSessionProps) => {
  const { view, selected, step, photoUrl, busy, error, result, startQuickCheck, select } = useQuickCheckStore();
  const { confirmAnswer, choosePhoto, sendWithPhoto, dontKnow, backToAnswer, retryFinish } = useQuickCheck();

  useEffect(() => {
    startQuickCheck(initialView);
  }, [initialView, startQuickCheck]);

  // Resumed after the last answer (tab closed before the result): finish it now.
  const needsFinish = view?.id === initialView.id && !view.current && !result && busy === 'idle' && !error;
  useEffect(() => {
    if (needsFinish) retryFinish();
  }, [needsFinish, retryFinish]);

  // The store outlives the page, so ignore state left over from a different session.
  if (!view || view.id !== initialView.id) return null;
  if (result) return <QuickCheckComplete result={result} />;

  if (busy === 'finishing' || !view.current) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
        {busy === 'finishing' || !error ? (
          <>
            <Loader2 className="size-12 animate-spin text-sky" />
            <p className="text-lg font-extrabold">{QUICK_CHECK_COPY.analysing}</p>
          </>
        ) : (
          <>
            <p className="font-bold text-destructive">{error}</p>
            <Button size="lg" onClick={retryFinish}>
              {DIAGNOSTIC_COPY.finish}
            </Button>
          </>
        )}
      </div>
    );
  }

  const question = view.current;
  const slots = Array.from({ length: view.total }, (_, i) => `slot-${i}`);
  const chosen = question.options.find((o) => o.key === selected);
  const sending = busy === 'sending';
  const isPhotoStep = step === 'photo' && chosen;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-6">
        <Button asChild variant="ghost" size="icon" aria-label={DIAGNOSTIC_COPY.close}>
          <Link href={DIAGNOSTIC_ROUTE}>
            <X className="size-6 text-muted-foreground" />
          </Link>
        </Button>
        <SessionProgressBar
          total={view.total}
          currentIndex={view.answeredCount}
          answeredIds={new Set(slots.slice(0, view.answeredCount))}
          questionIds={slots}
          label={DIAGNOSTIC_COPY.answeredOf}
        />
        <span className="shrink-0 text-sm font-extrabold text-muted-foreground">
          {view.answeredCount + 1}/{view.total}
        </span>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div key={question.id} className="animate-rise flex flex-col gap-4">
          <p className="text-sm font-extrabold text-sky">
            {QUICK_CHECK_COPY.questionOf} {view.answeredCount + 1}
          </p>
          <h1 className="text-lg font-bold sm:text-xl">
            <MathText text={question.text} />
          </h1>
          {question.imageUrls.map((url) => (
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
        </div>

        {isPhotoStep ? (
          <WorkPhotoStep
            optionKey={chosen.key}
            optionText={chosen.text}
            photoUrl={photoUrl}
            compressing={busy === 'compressing'}
            disabled={sending}
            onChoose={(file) => void choosePhoto(file)}
            onChangeAnswer={backToAnswer}
          />
        ) : (
          <div role="radiogroup" aria-label={DIAGNOSTIC_COPY.chooseAnswer} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((option) => (
              <AnswerOptionTile
                key={option.key}
                optionKey={option.key}
                text={option.text}
                selected={selected === option.key}
                disabled={sending}
                onSelect={() => select(option.key)}
              />
            ))}
          </div>
        )}
      </main>

      <div className="sticky bottom-0 border-t-2 bg-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          {isPhotoStep ? (
            <Button type="button" variant="ghost" size="icon" aria-label={DIAGNOSTIC_COPY.back} onClick={backToAnswer} disabled={sending}>
              <ArrowLeft className="size-5" />
            </Button>
          ) : (
            <Button type="button" variant="outline" size="lg" onClick={dontKnow} disabled={sending}>
              {DIAGNOSTIC_COPY.dontKnow}
            </Button>
          )}
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          {isPhotoStep ? (
            <Button type="button" size="lg" onClick={sendWithPhoto} disabled={!photoUrl || sending || busy === 'compressing'}>
              {sending ? QUICK_CHECK_COPY.sending : QUICK_CHECK_COPY.send}
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={confirmAnswer} disabled={!selected || sending}>
              {sending ? DIAGNOSTIC_COPY.saving : DIAGNOSTIC_COPY.next}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
