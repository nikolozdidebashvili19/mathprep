import { Clock, Target, Trophy } from 'lucide-react';
import Link from 'next/link';

import { DiagnosticResult } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { DIAGNOSTIC_COPY } from '@/shared/const/diagnostic.const';
import { REPORT_COPY } from '@/shared/const/report.const';
import { HOME_ROUTE_AFTER_LOGIN, REPORT_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';

type DiagnosticCompleteProps = {
  result: DiagnosticResult;
};

const STAGGER = ['animate-rise-1', 'animate-rise-2', 'animate-rise-3'];

/** Lesson-complete screen (T-029): three stat tiles pop in, one primary Continue. */
export const DiagnosticComplete = ({ result }: DiagnosticCompleteProps) => {
  const accuracy = result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0;
  const tiles = [
    { icon: Trophy, label: DIAGNOSTIC_COPY.scoreLabel, value: `${result.score}/${result.maxScore}`, tone: 'border-xp text-xp' },
    { icon: Target, label: DIAGNOSTIC_COPY.accuracyLabel, value: `${accuracy}%`, tone: 'border-primary text-primary' },
    {
      icon: Clock,
      label: DIAGNOSTIC_COPY.timeLabel,
      value: `${result.durationMinutes} ${DIAGNOSTIC_COPY.minutesUnit}`,
      tone: 'border-sky text-sky',
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="animate-rise flex flex-col gap-2">
        <h1 className="text-3xl">{DIAGNOSTIC_COPY.completeTitle}</h1>
        <p className="font-semibold text-muted-foreground">{DIAGNOSTIC_COPY.completeSubtitle}</p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {tiles.map(({ icon: Icon, label, value, tone }, i) => (
          <div
            key={label}
            className={cn('animate-pop flex flex-col overflow-hidden rounded-2xl border-2', tone, STAGGER[i])}
          >
            <p className="bg-current py-1 text-xs font-extrabold">
              <span className="text-background">{label}</span>
            </p>
            <p className="flex items-center justify-center gap-1.5 bg-card px-2 py-4 text-lg font-extrabold">
              <Icon className="size-5 shrink-0" />
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button asChild size="lg">
          <Link href={REPORT_ROUTE}>{REPORT_COPY.seeDetails}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={HOME_ROUTE_AFTER_LOGIN}>{DIAGNOSTIC_COPY.toDashboard}</Link>
        </Button>
      </div>
    </div>
  );
};
