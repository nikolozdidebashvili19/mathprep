import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { DiagnosticSummaryCard } from '@/features/dashboard/components/diagnostic-summary-card';
import { DailyGoalCard, StatPills, StreakCard } from '@/features/dashboard/components/learning-stats';
import { LessonPath } from '@/features/dashboard/components/lesson-path';
import { Button } from '@/shared/components/ui/button';
import { DASHBOARD_COPY, JOURNEY_STEPS, type LearningStats } from '@/shared/const/dashboard.const';
import { cn } from '@/shared/lib/utils';

type DashboardOverviewProps = {
  userName: string;
  /** Index into JOURNEY_STEPS of the step the student is on (journeyStepIndex). */
  currentStepIndex: number;
  stats: LearningStats;
  latestDiagnostic: { sessionId: string; weak: { code: string; nameKa: string }[] } | null;
};

export const DashboardOverview = ({ userName, currentStepIndex, stats, latestDiagnostic }: DashboardOverviewProps) => {
  const current = JOURNEY_STEPS[Math.min(currentStepIndex, JOURNEY_STEPS.length - 1)];
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="animate-rise flex items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl">
            {DASHBOARD_COPY.greeting}, {userName}!
          </h1>
          <div className="lg:hidden">
            <StatPills stats={stats} />
          </div>
        </div>

        <div
          className={cn(
            'animate-rise animate-rise-1 flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground',
            'shadow-edge-primary-lg sm:flex-row sm:items-center sm:justify-between'
          )}
        >
          <div>
            <p className="text-sm font-extrabold opacity-80">{current.banner.label}</p>
            <h2 className="text-xl">{current.banner.title}</h2>
            <p className="mt-1 text-sm font-semibold opacity-90">{current.banner.description}</p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href={current.href}>
              {current.banner.cta}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <DiagnosticSummaryCard latest={latestDiagnostic} />

        <LessonPath currentStepIndex={currentStepIndex} />
      </div>

      <aside className="hidden flex-col gap-4 lg:flex">
        <div className="flex justify-end">
          <StatPills stats={stats} />
        </div>
        <StreakCard stats={stats} />
        <DailyGoalCard stats={stats} />
      </aside>
    </div>
  );
};
