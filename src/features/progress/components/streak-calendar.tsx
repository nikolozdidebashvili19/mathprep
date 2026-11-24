import { Flame } from 'lucide-react';

import { CalendarDay } from '@/features/progress/types/progress.types';
import { PROGRESS_COPY, WEEKDAY_SHORT } from '@/shared/const/progress.const';
import { cn } from '@/shared/lib/utils';

type StreakCalendarProps = {
  weeks: CalendarDay[][];
};

/** The last few weeks, Monday first: a flame on every day the student practised (T-029 streak calendar). */
export const StreakCalendar = ({ weeks }: StreakCalendarProps) => (
  <div className="flex flex-col gap-3">
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {WEEKDAY_SHORT.map((d) => (
        <span key={d} className="text-center text-xs font-extrabold text-muted-foreground">
          {d}
        </span>
      ))}
      {weeks.flat().map((day) => (
        <span
          key={day.key}
          title={day.key}
          aria-label={`${day.key}${day.active ? ' ✓' : ''}`}
          className={cn(
            'flex aspect-square items-center justify-center rounded-xl border-2 text-xs font-extrabold',
            day.active ? 'border-streak bg-streak/15 text-streak' : 'border-border text-muted-foreground',
            day.future && 'border-dashed opacity-40',
            day.today && 'ring-2 ring-sky ring-offset-2 ring-offset-card'
          )}
        >
          {day.active ? <Flame className="size-5 sm:size-6" fill="currentColor" /> : Number(day.key.slice(8))}
        </span>
      ))}
    </div>
    <p className="text-xs font-bold text-muted-foreground">{PROGRESS_COPY.calendarHint}</p>
  </div>
);
