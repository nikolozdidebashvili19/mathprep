import { Flame, Zap } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { SkillMasteryList } from '@/features/progress/components/skill-mastery-list';
import { WeekStrip } from '@/features/progress/components/week-strip';
import { ProgressView } from '@/features/progress/types/progress.types';
import { Button } from '@/shared/components/ui/button';
import { ExpandableSection } from '@/shared/components/ui/expandable-section';
import { SegmentedBar } from '@/shared/components/ui/segmented-bar';
import { COURSE_BAR_SEGMENTS, PROGRESS_COPY, PROGRESS_VISIBLE_SKILLS } from '@/shared/const/progress.const';
import { PRACTICE_TODAY_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';

type ProgressOverviewProps = {
  progress: ProgressView;
};

const streakMessage = (p: ProgressView) => {
  if (p.activeToday) return PROGRESS_COPY.streakAlive;
  return p.streakDays > 0 ? PROGRESS_COPY.streakAtRisk : PROGRESS_COPY.streakZero;
};

/** Same shape as the dashboard's green banner: one big number, one line of encouragement, one action. */
const StreakBanner = ({ progress }: ProgressOverviewProps) => (
  <div className="animate-rise animate-rise-1 flex flex-col gap-4 rounded-2xl bg-streak p-5 text-white shadow-edge-lg sm:flex-row sm:items-center">
    <Flame className={cn('size-14 shrink-0', progress.activeToday && 'animate-bob')} fill="currentColor" />
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-3xl font-extrabold">
        {progress.streakDays} <span className="text-lg">{PROGRESS_COPY.streakTitle}</span>
      </p>
      <p className="font-bold opacity-90">{streakMessage(progress)}</p>
      <p className="flex items-center gap-3 text-sm font-extrabold opacity-90">
        <span>
          {PROGRESS_COPY.bestStreak}: {progress.bestStreak}
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap className="size-4" fill="currentColor" />
          {progress.xp} {PROGRESS_COPY.totalXp}
        </span>
      </p>
    </div>
    {!progress.activeToday && (
      <Button asChild variant="outline" className="shrink-0">
        <Link href={PRACTICE_TODAY_ROUTE}>{PROGRESS_COPY.startToday}</Link>
      </Button>
    )}
  </div>
);

const Panel = ({ title, aside, children, className }: { title: string; aside?: string; children: ReactNode; className?: string }) => (
  <section className={cn('animate-rise flex flex-col gap-4 rounded-2xl border-2 bg-card p-5', className)}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg">{title}</h2>
      {aside && <span className="text-sm font-extrabold text-muted-foreground">{aside}</span>}
    </div>
    {children}
  </section>
);

/** Progress page (T-024), kept simple: streak, this week, course, and the skills being worked on now. */
export const ProgressOverview = ({ progress }: ProgressOverviewProps) => {
  const visible = progress.skills.slice(0, PROGRESS_VISIBLE_SKILLS);
  const rest = progress.skills.slice(PROGRESS_VISIBLE_SKILLS);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="animate-rise text-2xl sm:text-3xl">{PROGRESS_COPY.title}</h1>

      <StreakBanner progress={progress} />

      <Panel title={PROGRESS_COPY.weekTitle} className="animate-rise-2">
        <WeekStrip week={progress.week} />
      </Panel>

      {progress.course && (
        <Panel
          title={PROGRESS_COPY.courseTitle}
          aside={PROGRESS_COPY.courseDays(progress.course.daysCompleted, progress.course.durationDays)}
          className="animate-rise-3"
        >
          <SegmentedBar
            ratio={progress.course.daysCompleted / progress.course.durationDays}
            segments={COURSE_BAR_SEGMENTS}
            fillClassName="bg-primary"
            label={PROGRESS_COPY.courseTitle}
            valueText={PROGRESS_COPY.courseDays(progress.course.daysCompleted, progress.course.durationDays)}
          />
        </Panel>
      )}

      <Panel title={PROGRESS_COPY.masteryTitle} className="animate-rise-4">
        <SkillMasteryList skills={visible} />
        {rest.length > 0 && (
          <ExpandableSection title={PROGRESS_COPY.allSkills} count={progress.skills.length} className="bg-transparent">
            <SkillMasteryList skills={rest} />
          </ExpandableSection>
        )}
      </Panel>
    </div>
  );
};
