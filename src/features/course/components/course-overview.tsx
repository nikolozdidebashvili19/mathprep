import { BookOpen, CalendarCheck, Check, Dumbbell, History, Target, Trophy, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { ReplanButton } from '@/features/course/components/replan-button';
import { BlockKind, BlockView, CourseView, DayView, PlannedSkillStatus } from '@/features/course/types/course.types';
import { Button } from '@/shared/components/ui/button';
import { COURSE_COPY, PRACTICE_COPY } from '@/shared/const/course.const';
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

/** The running course: progress, today's blocks, the next days, skills in teaching order and what is left out. */
export const CourseOverview = ({ course }: CourseOverviewProps) => {
  const progress = Math.round(((course.todayIndex + 1) / course.durationDays) * 10);
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <div className="animate-rise flex flex-col gap-3">
          <p className="text-sm font-extrabold text-sky">{COURSE_COPY.dayOf(course.todayIndex + 1, course.durationDays)}</p>
          <h1 className="text-2xl sm:text-3xl">{COURSE_COPY.todayTitle}</h1>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full bg-primary', PROGRESS_WIDTH[progress])} />
          </div>
        </div>

        {course.today && (
          <section className="animate-rise-1 flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
              {course.today.blocks.map((block) => (
                <BlockRow key={`${block.kind}-${block.skillCode}`} block={block} />
              ))}
            </ul>
            {course.todayCompleted ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-primary bg-primary/10 p-3">
                <p className="flex items-center gap-2 font-extrabold text-primary">
                  <Check className="size-5" />
                  {PRACTICE_COPY.todayDone}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href={PRACTICE_TODAY_ROUTE}>{PRACTICE_COPY.review}</Link>
                </Button>
              </div>
            ) : (
              <Button asChild size="lg" className="sm:self-start">
                <Link href={PRACTICE_TODAY_ROUTE}>{COURSE_COPY.start}</Link>
              </Button>
            )}
          </section>
        )}

        {course.upcoming.length > 0 && (
          <section className="animate-rise-2 flex flex-col gap-3">
            <h2 className="text-xl">{COURSE_COPY.upcomingTitle}</h2>
            <ul className="flex flex-col gap-2">
              {course.upcoming.map((day) => (
                <UpcomingDay key={day.dayIndex} day={day} />
              ))}
            </ul>
          </section>
        )}
        {course.pastDays.length > 0 && (
          <section className="animate-rise-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl">{COURSE_COPY.pastTitle}</h2>
              <p className="text-sm font-semibold text-muted-foreground">{COURSE_COPY.pastHint}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {course.pastDays.map((day) => (
                <PastDay key={day.dayIndex} day={day} />
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="animate-rise-3 flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
          <h2 className="text-lg">{COURSE_COPY.planTitle}</h2>
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
        </section>

        {course.omitted.length > 0 && (
          <section className="flex flex-col gap-2 rounded-2xl border-2 border-dashed p-4">
            <h2 className="text-base">{COURSE_COPY.omittedTitle}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{course.omitted.map((s) => s.nameKa).join(', ')}</p>
          </section>
        )}

        <ReplanButton />
      </aside>
    </div>
  );
};

/** Progress bar widths in 10% steps (no inline styles, no arbitrary values). */
const PROGRESS_WIDTH = ['w-0', 'w-1/10', 'w-2/10', 'w-3/10', 'w-4/10', 'w-5/10', 'w-6/10', 'w-7/10', 'w-8/10', 'w-9/10', 'w-full'];
