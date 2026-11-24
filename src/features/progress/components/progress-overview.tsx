import { CheckCheck, Flame, Target, Trophy, Zap, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { DailyGoalCard } from '@/features/dashboard/components/learning-stats';
import { SkillMasteryList } from '@/features/progress/components/skill-mastery-list';
import { StreakCalendar } from '@/features/progress/components/streak-calendar';
import { WeeklyXp } from '@/features/progress/components/weekly-xp';
import { ProgressView } from '@/features/progress/types/progress.types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { SegmentedBar } from '@/shared/components/ui/segmented-bar';
import { COURSE_BAR_SEGMENTS, PROGRESS_COPY } from '@/shared/const/progress.const';
import { PRACTICE_TODAY_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';

type ProgressOverviewProps = {
  progress: ProgressView;
};

const STAGGER = ['animate-rise-1', 'animate-rise-2', 'animate-rise-3', 'animate-rise-4'];

type StatTile = { icon: LucideIcon; label: string; value: string; tone: string };

const streakMessage = (p: ProgressView) => {
  if (p.activeToday) return PROGRESS_COPY.streakAlive;
  return p.streakDays > 0 ? PROGRESS_COPY.streakAtRisk : PROGRESS_COPY.streakZero;
};

const StreakHero = ({ progress }: ProgressOverviewProps) => (
  <div className="animate-rise animate-rise-1 flex flex-col gap-4 rounded-2xl bg-streak p-5 text-white shadow-edge-lg sm:flex-row sm:items-center">
    <Flame className={cn('size-16 shrink-0', progress.activeToday && 'animate-bob')} fill="currentColor" />
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-4xl font-extrabold">
        {progress.streakDays} <span className="text-xl">{PROGRESS_COPY.streakTitle}</span>
      </p>
      <p className="font-bold opacity-90">{streakMessage(progress)}</p>
      <p className="text-sm font-bold opacity-80">
        {PROGRESS_COPY.bestStreak}: {progress.bestStreak}
      </p>
    </div>
    {!progress.activeToday && (
      <Button asChild variant="outline" size="lg" className="shrink-0">
        <Link href={PRACTICE_TODAY_ROUTE}>{PROGRESS_COPY.startToday}</Link>
      </Button>
    )}
  </div>
);

const StatTiles = ({ progress }: ProgressOverviewProps) => {
  const accuracy = progress.answeredCount > 0 ? Math.round((progress.correctCount / progress.answeredCount) * 100) : 0;
  const tiles: StatTile[] = [
    { icon: Zap, label: PROGRESS_COPY.totalXp, value: `${progress.xp}`, tone: 'border-xp text-xp' },
    { icon: Trophy, label: PROGRESS_COPY.todayXp, value: `+${progress.xpToday}`, tone: 'border-xp text-xp' },
    { icon: CheckCheck, label: PROGRESS_COPY.answered, value: `${progress.answeredCount}`, tone: 'border-sky text-sky' },
    { icon: Target, label: PROGRESS_COPY.accuracy, value: `${accuracy}%`, tone: 'border-primary text-primary' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, tone }, i) => (
        <div key={label} className={cn('animate-pop flex flex-col overflow-hidden rounded-2xl border-2', tone, STAGGER[i % STAGGER.length])}>
          <p className="bg-current px-2 py-1 text-center text-xs font-extrabold">
            <span className="text-background">{label}</span>
          </p>
          <p className="flex items-center justify-center gap-1.5 bg-card px-2 py-3 text-lg font-extrabold">
            <Icon className="size-5 shrink-0" />
            {value}
          </p>
        </div>
      ))}
    </div>
  );
};

const CourseCard = ({ course }: { course: ProgressView['course'] }) => (
  <Card className="gap-4">
    <CardHeader>
      <CardTitle className="text-lg font-extrabold">{PROGRESS_COPY.courseTitle}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {course ? (
        <>
          <SegmentedBar
            ratio={course.daysCompleted / course.durationDays}
            segments={COURSE_BAR_SEGMENTS}
            fillClassName="bg-primary"
            label={PROGRESS_COPY.courseTitle}
            valueText={PROGRESS_COPY.courseDays(course.daysCompleted, course.durationDays)}
          />
          <p className="text-sm font-bold text-muted-foreground">{PROGRESS_COPY.courseDays(course.daysCompleted, course.durationDays)}</p>
        </>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">{PROGRESS_COPY.noCourse}</p>
      )}
    </CardContent>
  </Card>
);

/** Progress page (T-024): streak, XP, active-day calendar, weekly XP, course completion and skill mastery. */
export const ProgressOverview = ({ progress }: ProgressOverviewProps) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
    <div className="animate-rise flex flex-col gap-1">
      <h1 className="text-2xl sm:text-3xl">{PROGRESS_COPY.title}</h1>
      <p className="font-semibold text-muted-foreground">{PROGRESS_COPY.subtitle}</p>
    </div>

    <StreakHero progress={progress} />
    <StatTiles progress={progress} />

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">{PROGRESS_COPY.calendarTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <StreakCalendar weeks={progress.calendar} />
          </CardContent>
        </Card>
        <DailyGoalCard
          stats={{
            streakDays: progress.streakDays,
            xp: progress.xp,
            minutesToday: progress.minutesToday,
            dailyGoalMinutes: progress.dailyGoalMinutes,
          }}
        />
        <CourseCard course={progress.course} />
      </div>
      <div className="flex flex-col gap-6">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">{PROGRESS_COPY.weeklyXpTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyXp weeks={progress.weeklyXp} />
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold">{PROGRESS_COPY.masteryTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillMasteryList skills={progress.skills} />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);
