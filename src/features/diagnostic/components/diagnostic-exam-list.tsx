import { ClipboardCheck, Info } from 'lucide-react';
import Link from 'next/link';

import { QuickCheckCard } from '@/features/diagnostic/components/quick-check-card';
import { DiagnosticExamSummary, QuickCheckSummary } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { DIAGNOSTIC_COPY, QUICK_CHECK_COPY } from '@/shared/const/diagnostic.const';
import { DIAGNOSTIC_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';

type DiagnosticExamListProps = {
  exams: DiagnosticExamSummary[];
  quickCheck: QuickCheckSummary;
};

const STAGGER = ['animate-rise-1', 'animate-rise-2', 'animate-rise-3', 'animate-rise-4'];

const ExamCard = ({ exam, index }: { exam: DiagnosticExamSummary; index: number }) => {
  const cta = exam.inProgress ? DIAGNOSTIC_COPY.resume : exam.lastResult ? DIAGNOSTIC_COPY.retake : DIAGNOSTIC_COPY.start;

  return (
    <Card className={cn('animate-rise gap-4 py-5', STAGGER[Math.min(index, STAGGER.length - 1)])}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky text-sky-foreground shadow-edge-sky">
          <ClipboardCheck className="size-7" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-lg">
            {DIAGNOSTIC_COPY.examLabel} {exam.year}
          </h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {DIAGNOSTIC_COPY.variantLabel} {exam.variant} · {exam.questionCount} {DIAGNOSTIC_COPY.questionsUnit} ·{' '}
            {exam.maxScore} {DIAGNOSTIC_COPY.pointsUnit}
          </p>
          {exam.inProgress && (
            <p className="text-sm font-bold text-sky">
              {DIAGNOSTIC_COPY.answeredOf}: {exam.inProgress.answered}/{exam.questionCount}
            </p>
          )}
          {exam.lastResult && (
            <p className="text-sm font-bold text-primary">
              {DIAGNOSTIC_COPY.lastResult}: {exam.lastResult.score}/{exam.lastResult.maxScore}
            </p>
          )}
        </div>
        <Button asChild size="lg" variant={exam.inProgress ? 'sky' : exam.lastResult ? 'outline' : 'default'}>
          <Link href={`${DIAGNOSTIC_ROUTE}/${exam.code}`}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export const DiagnosticExamList = ({ exams, quickCheck }: DiagnosticExamListProps) => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <div className="animate-rise flex flex-col gap-2">
      <h1 className="text-2xl sm:text-3xl">{DIAGNOSTIC_COPY.title}</h1>
      <p className="font-semibold text-muted-foreground">{DIAGNOSTIC_COPY.intro}</p>
    </div>

    <QuickCheckCard summary={quickCheck} />

    <div className="animate-rise-1 flex flex-col gap-1 pt-4">
      <h2 className="text-xl">{QUICK_CHECK_COPY.fullMockTitle}</h2>
      <p className="text-sm font-semibold text-muted-foreground">{QUICK_CHECK_COPY.fullMockIntro}</p>
    </div>

    {exams.length === 0 ? (
      <Card>
        <CardContent className="font-semibold text-muted-foreground">{DIAGNOSTIC_COPY.empty}</CardContent>
      </Card>
    ) : (
      <div className="flex flex-col gap-4">
        {exams.map((exam, i) => (
          <ExamCard key={exam.code} exam={exam} index={i} />
        ))}
      </div>
    )}

    <p className="flex items-start gap-2 text-sm font-semibold text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      {DIAGNOSTIC_COPY.writtenNote}
    </p>
  </div>
);
