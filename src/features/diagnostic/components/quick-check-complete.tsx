import { Camera, Clock, Target, Trophy } from 'lucide-react';
import Link from 'next/link';

import { SkillResultLists } from '@/features/diagnostic/components/skill-result-lists';
import { QuickCheckResult } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { DIAGNOSTIC_COPY, QUICK_CHECK_COPY } from '@/shared/const/diagnostic.const';
import { REPORT_COPY } from '@/shared/const/report.const';
import { HOME_ROUTE_AFTER_LOGIN, REPORT_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';

type QuickCheckCompleteProps = {
  result: QuickCheckResult;
};

const STAGGER = ['animate-rise-1', 'animate-rise-2', 'animate-rise-3', 'animate-rise-4'];

/** Quick-check result: three stat tiles, weak/strong skills, then the per-question review (photos + feedback). */
export const QuickCheckComplete = ({ result }: QuickCheckCompleteProps) => {
  const accuracy = result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0;
  const tiles = [
    { icon: Trophy, label: DIAGNOSTIC_COPY.scoreLabel, value: `${result.correctCount}/${result.total}`, tone: 'border-xp text-xp' },
    { icon: Target, label: DIAGNOSTIC_COPY.accuracyLabel, value: `${accuracy}%`, tone: 'border-primary text-primary' },
    { icon: Clock, label: DIAGNOSTIC_COPY.timeLabel, value: `${result.durationMinutes} ${DIAGNOSTIC_COPY.minutesUnit}`, tone: 'border-sky text-sky' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="animate-rise flex flex-col gap-2 text-center">
        <h1 className="text-3xl">{QUICK_CHECK_COPY.resultTitle}</h1>
        <p className="font-semibold text-muted-foreground">{QUICK_CHECK_COPY.resultSubtitle}</p>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {tiles.map(({ icon: Icon, label, value, tone }, i) => (
          <div key={label} className={cn('animate-pop flex flex-col overflow-hidden rounded-2xl border-2 text-center', tone, STAGGER[i])}>
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

      <SkillResultLists weak={result.weak} strong={result.strong} />

      <p className="animate-rise-4 flex items-start gap-2 text-sm font-semibold text-muted-foreground">
        <Camera className="mt-0.5 size-4 shrink-0" />
        {QUICK_CHECK_COPY.photosAnalysed}: {result.photosAnalysed}/{result.photosTotal}
        {result.photosAnalysed < result.photosTotal && ` · ${QUICK_CHECK_COPY.photosPending}`}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href={`${REPORT_ROUTE}/${result.sessionId}`}>{REPORT_COPY.seeDetails}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={HOME_ROUTE_AFTER_LOGIN}>{QUICK_CHECK_COPY.toDashboard}</Link>
        </Button>
      </div>
    </div>
  );
};
