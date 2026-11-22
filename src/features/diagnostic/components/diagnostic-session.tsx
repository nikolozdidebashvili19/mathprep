'use client';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';

import { AnswerOptionTile } from '@/features/diagnostic/components/answer-option-tile';
import { DiagnosticComplete } from '@/features/diagnostic/components/diagnostic-complete';
import { SessionProgressBar } from '@/features/diagnostic/components/session-progress-bar';
import { useAnswerQuestion } from '@/features/diagnostic/hooks/use-answer-question';
import { useDiagnosticStore } from '@/features/diagnostic/hooks/useDiagnosticStore';
import { DiagnosticSessionView } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { DIAGNOSTIC_COPY } from '@/shared/const/diagnostic.const';
import { DIAGNOSTIC_ROUTE } from '@/shared/const/routes.const';

type DiagnosticSessionProps = {
  initialSession: DiagnosticSessionView;
};

/**
 * Full-screen diagnostic (T-012 + T-029 session rules): close button, segmented progress, one question per
 * screen, big option tiles, sticky bottom bar. Diagnostic mode gives no right/wrong feedback, only "next".
 */
export const DiagnosticSession = ({ initialSession }: DiagnosticSessionProps) => {
  const { session, currentIndex, selected, saving, error, result, startSession, select } = useDiagnosticStore();
  const { submitAnswer, goBack } = useAnswerQuestion();

  useEffect(() => {
    startSession(initialSession);
  }, [initialSession, startSession]);

  const answeredIds = useMemo(() => new Set(Object.keys(session?.answers ?? {})), [session?.answers]);

  // The store outlives the page, so ignore state left over from a different session.
  if (!session || session.id !== initialSession.id) return null;
  if (result) return <DiagnosticComplete result={result} />;

  const question = session.questions[currentIndex];
  if (!question) return null;
  const isLast = currentIndex === session.questions.length - 1;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-6">
        <Button asChild variant="ghost" size="icon" aria-label={DIAGNOSTIC_COPY.close}>
          <Link href={DIAGNOSTIC_ROUTE}>
            <X className="size-6 text-muted-foreground" />
          </Link>
        </Button>
        <SessionProgressBar
          total={session.questions.length}
          currentIndex={currentIndex}
          answeredIds={answeredIds}
          questionIds={session.questions.map((q) => q.id)}
          label={DIAGNOSTIC_COPY.answeredOf}
        />
        <span className="shrink-0 text-sm font-extrabold text-muted-foreground">
          {currentIndex + 1}/{session.questions.length}
        </span>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div key={question.id} className="animate-rise flex flex-col gap-4">
          <p className="text-sm font-extrabold text-sky">
            {DIAGNOSTIC_COPY.questionLabel} {question.number} · {question.maxPoints} {DIAGNOSTIC_COPY.pointsUnit}
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

        <div role="radiogroup" aria-label={DIAGNOSTIC_COPY.chooseAnswer} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {question.options.map((option) => (
            <AnswerOptionTile
              key={option.key}
              optionKey={option.key}
              text={option.text}
              selected={selected === option.key}
              disabled={saving}
              onSelect={() => select(option.key)}
            />
          ))}
        </div>
      </main>

      <div className="sticky bottom-0 border-t-2 bg-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={DIAGNOSTIC_COPY.back}
              onClick={goBack}
              disabled={saving || currentIndex === 0}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => submitAnswer('')} disabled={saving}>
              {DIAGNOSTIC_COPY.dontKnow}
            </Button>
          </div>
          {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          <Button
            type="button"
            size="lg"
            onClick={() => selected && submitAnswer(selected)}
            disabled={!selected || saving}
          >
            {saving ? DIAGNOSTIC_COPY.saving : isLast ? DIAGNOSTIC_COPY.finish : DIAGNOSTIC_COPY.next}
          </Button>
        </div>
      </div>
    </div>
  );
};
