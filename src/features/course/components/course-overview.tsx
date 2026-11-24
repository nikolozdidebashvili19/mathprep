import { BookOpen, CalendarCheck, Check, Dumbbell, History, Play, Target, Trophy, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { ReplanButton } from '@/features/course/components/replan-button';
import { BlockKind, BlockView, CourseView, DayView, PlannedSkillStatus } from '@/features/course/types/course.types';
import { Button } from '@/shared/components/ui/button';
import { ExpandableSection } from '@/shared/components/ui/expandable-section';
import { SegmentedBar } from '@/shared/components/ui/segmented-bar';
import { COURSE_COPY, PRACTICE_COPY } from '@/shared/const/course.const';
import { COURSE_BAR_SEGMENTS } from '@/shared/const/progress.const';
import { COURSE_DAY_ROUTE, PRACTICE_TODAY_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';
import { formatDate } from '@/shared/utils/format';

type CourseOverviewProps = {
  course: CourseView;
};

const BLOCK_ICONS: Record<BlockKind, LucideIcon> = {
  theory: BookOpen,
  practice: Target,
  drill: Dumbbell,
  revision: History,
  check: CalendarCheck,
  mock: Trophy,
};

const BLOCK_TONES: Record<BlockKind, string> = {
  theory: 'bg-sky text-sky-foreground',
  practice: 'bg-primary text-primary-foreground',
  drill: 'bg-streak text-white',
  revision: 'bg-muted text-foreground',
  check: 'bg-xp text-white',
  mock: 'bg-xp text-white',
};

const STATUS_TONES: Record<PlannedSkillStatus, string> = {
  weak: 'border-streak text-streak',
  partial: 'border-sky text-sky',
  untested: 'border-dashed border-border text-muted-foreground',
};

const blockSubject = (b: BlockView) => {
  if (b.skillName) return b.skillName;
  if (b.kind === 'revision') return COURSE_COPY.savedMistakes;
  if (b.kind === 'practice') return COURSE_COPY.mixedPractice;
  return null;
};

const BlockRow = ({ block }: { block: BlockView }) => {
  const Icon = BLOCK_ICONS[block.kind];
  const subject = blockSubject(block);
  return (
    <li className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3">
      <span className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-xl', BLOCK_TONES[block.kind])}>
        <Icon className="size-5" />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="font-extrabold">{COURSE_COPY.blockKinds[block.kind]}</span>
        {subject && <span className="text-sm font-semibold text-muted-foreground">{subject}</span>}
      </span>
      <span className="shrink-0 text-sm font-extrabold text-muted-foreground">
        {block.minutes} {COURSE_COPY.minutesUnit}
      </span>
    </li>
  );
};

const UpcomingDay = ({ day }: { day: DayView }) => {
  const main = day.blocks.find((b) => b.kind !== 'revision' && b.kind !== 'drill') ?? day.blocks[0];
  if (!main) return null;
  const Icon = BLOCK_ICONS[main.kind];
  return (
    <li className="flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="w-20 shrink-0 font-bold text-muted-foreground">{formatDate(day.date, 'ka-GE')}</span>
      <span className="font-bold">{blockSubject(main) ?? COURSE_COPY.blockKinds[main.kind]}</span>
    </li>
  );
};

/** An earlier day: opens its session to review answers and theory, or to finish it. */
const PastDay = ({ day }: { day: DayView }) => {
  const main = day.blocks.find((b) => b.kind !== 'revision' && b.kind !== 'drill') ?? day.blocks[0];
  if (!main) return null;
  const Icon = BLOCK_ICONS[main.kind];
  return (
    <li>
      <Link
        href={`${COURSE_DAY_ROUTE}/${day.dayIndex + 1}`}
        className="flex items-center gap-3 rounded-xl border-2 px-3 py-2 text-sm transition-colors hover:bg-muted"
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="w-16 shrink-0 font-extrabold text-muted-foreground">{COURSE_COPY.dayLabel(day.dayIndex + 1)}</span>
        <span className="flex-1 font-bold">{blockSubject(main) ?? COURSE_COPY.blockKinds[main.kind]}</span>
        {day.completed && <Check className="size-4 shrink-0 text-primary" />}
      </Link>
    </li>
  );
};

/** Same shape as the dashboard banner: where the student is, what today holds, one action. */
const TodayBanner = ({ course }: CourseOverviewProps) => {
  const blocks = course.today?.blocks ?? [];
  const minutes = blocks.reduce((sum, b) => sum + b.minutes, 0);
  return (
    <div className="animate-rise flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground shadow-edge-primary-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-extrabold opacity-80">{COURSE_COPY.dayOf(course.todayIndex + 1, course.durationDays)}</p>
          <h1 className="text-2xl">{COURSE_COPY.todayTitle}</h1>
          <p className="mt-1 text-sm font-semibold opacity-90">
            {course.todayCompleted ? PRACTICE_COPY.todayDone : COURSE_COPY.todaySummary(blocks.length, minutes)}
          </p>
        </div>
        {course.today && (
          <Button asChild variant="outline" size="lg" className="shrink-0">
            <Link href={PRACTICE_TODAY_ROUTE}>
              {course.todayCompleted ? <Check className="size-5" /> : <Play className="size-5" fill="currentColor" />}
              {course.todayCompleted ? PRACTICE_COPY.review : COURSE_COPY.start}
            </Link>
          </Button>
        )}
      </div>
      <SegmentedBar
        ratio={(course.todayIndex + 1) / course.durationDays}
        segments={COURSE_BAR_SEGMENTS}
        fillClassName="bg-primary-foreground"
        label={COURSE_COPY.dayOf(course.todayIndex + 1, course.durationDays)}
        className="h-2.5 bg-primary-foreground/25"
      />
    </div>
  );
};

/** The running course, kept simple: today's banner and steps; next days, past days and the skill order fold away. */
export const CourseOverview = ({ course }: CourseOverviewProps) => (
  <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <TodayBanner course={course} />

    {course.today && course.today.blocks.length > 0 && (
      <ul className="animate-rise animate-rise-1 flex flex-col gap-3">
        {course.today.blocks.map((block) => (
          <BlockRow key={`${block.kind}-${block.skillCode}`} block={block} />
        ))}
      </ul>
    )}

    <div className="animate-rise animate-rise-2 flex flex-col gap-3">
      {course.upcoming.length > 0 && (
        <ExpandableSection title={COURSE_COPY.upcomingTitle} count={course.upcoming.length}>
          <ul className="flex flex-col gap-2">
            {course.upcoming.map((day) => (
              <UpcomingDay key={day.dayIndex} day={day} />
            ))}
          </ul>
        </ExpandableSection>
      )}

      {course.pastDays.length > 0 && (
        <ExpandableSection title={COURSE_COPY.pastTitle} count={course.pastDays.length}>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-muted-foreground">{COURSE_COPY.pastHint}</p>
            <ul className="flex flex-col gap-2">
              {course.pastDays.map((day) => (
                <PastDay key={day.dayIndex} day={day} />
              ))}
            </ul>
          </div>
        </ExpandableSection>
      )}

      <ExpandableSection title={COURSE_COPY.planTitle} count={course.plannedSkills.length}>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted-foreground">{COURSE_COPY.planNote}</p>
          <ol className="flex flex-col gap-1.5">
            {course.plannedSkills.map((s, i) => (
              <li key={s.code} className="flex items-start gap-2 text-sm font-semibold">
                <span className="w-6 shrink-0 text-right font-extrabold text-muted-foreground">{i + 1}.</span>
                <span className="flex-1">{s.nameKa}</span>
                <span className={cn('shrink-0 rounded-full border-2 px-2 text-xs font-extrabold', STATUS_TONES[s.status])}>
                  {COURSE_COPY.skillStatus[s.status]}
                </span>
              </li>
            ))}
          </ol>
          {course.omitted.length > 0 && (
            <div className="flex flex-col gap-1 border-t-2 pt-3">
              <h3 className="text-sm">{COURSE_COPY.omittedTitle}</h3>
              <p className="text-sm font-semibold text-muted-foreground">{course.omitted.map((s) => s.nameKa).join(', ')}</p>
            </div>
          )}
          <div className="border-t-2 pt-3">
            <ReplanButton />
          </div>
        </div>
      </ExpandableSection>
    </div>
  </div>
);
