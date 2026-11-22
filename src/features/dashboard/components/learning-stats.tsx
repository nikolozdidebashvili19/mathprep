import { Flame, Zap } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { DASHBOARD_COPY, type LearningStats as LearningStatsData } from '@/shared/const/dashboard.const';
import { cn } from '@/shared/lib/utils';

const GOAL_SEGMENTS = 10;

type LearningStatsProps = {
  stats: LearningStatsData;
};

export const StatPills = ({ stats }: LearningStatsProps) => (
  <div className="flex items-center gap-4">
    <span className="inline-flex items-center gap-1.5 font-extrabold text-streak" title={DASHBOARD_COPY.streakLabel}>
      <Flame className={cn('size-6', stats.streakDays === 0 && 'text-muted-foreground')} fill="currentColor" />
      <span className={cn(stats.streakDays === 0 && 'text-muted-foreground')}>{stats.streakDays}</span>
    </span>
    <span className="inline-flex items-center gap-1.5 font-extrabold text-xp" title={DASHBOARD_COPY.xpLabel}>
      <Zap className="size-6" fill="currentColor" />
      <span>{stats.xp}</span>
    </span>
  </div>
);

export const DailyGoalCard = ({ stats }: LearningStatsProps) => {
  const ratio = stats.dailyGoalMinutes > 0 ? Math.min(stats.minutesToday / stats.dailyGoalMinutes, 1) : 0;
  const filled = Math.round(ratio * GOAL_SEGMENTS);

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-lg font-extrabold">{DASHBOARD_COPY.dailyGoalTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Zap className="size-8 shrink-0 text-xp" fill="currentColor" />
          <div
            className="flex h-4 flex-1 gap-0.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={stats.dailyGoalMinutes}
            aria-valuenow={stats.minutesToday}
            aria-label={DASHBOARD_COPY.dailyGoalTitle}
          >
            {Array.from({ length: GOAL_SEGMENTS }).map((_, i) => (
              <span key={i} className={cn('h-full flex-1', i < filled ? 'bg-xp' : 'bg-transparent')} />
            ))}
          </div>
        </div>
        <p className="text-sm font-bold text-muted-foreground">
          {stats.minutesToday} / {stats.dailyGoalMinutes} {DASHBOARD_COPY.dailyGoalUnit}
        </p>
      </CardContent>
    </Card>
  );
};

export const StreakCard = ({ stats }: LearningStatsProps) => (
  <Card className="gap-4">
    <CardHeader>
      <CardTitle className="text-lg font-extrabold">{DASHBOARD_COPY.statsTitle}</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2 rounded-xl border-2 border-border p-3">
        <Flame className="size-6 shrink-0 text-streak" fill="currentColor" />
        <div>
          <p className="font-extrabold">{stats.streakDays}</p>
          <p className="text-xs font-bold text-muted-foreground">{DASHBOARD_COPY.streakLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border-2 border-border p-3">
        <Zap className="size-6 shrink-0 text-xp" fill="currentColor" />
        <div>
          <p className="font-extrabold">{stats.xp}</p>
          <p className="text-xs font-bold text-muted-foreground">{DASHBOARD_COPY.xpLabel}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);
