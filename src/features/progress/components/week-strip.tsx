import { Flame } from 'lucide-react';

import { CalendarDay } from '@/features/progress/types/progress.types';
import { WEEKDAY_SHORT } from '@/shared/const/progress.const';
import { cn } from '@/shared/lib/utils';

type WeekStripProps = {
  week: CalendarDay[];
};

/** This week, Monday to Sunday: a flame on every day the student practised, today ringed in sky. */
export const WeekStrip = ({ week }: WeekStripProps) => (
  <ul className="grid grid-cols-7 gap-2">
    {week.map((day, i) => (
      <li key={day.key} className="flex flex-col items-center gap-1.5">
        <span className={cn('text-xs font-extrabold', day.today ? 'text-sky' : 'text-muted-foreground')}>{WEEKDAY_SHORT[i]}</span>
        <span
          aria-label={`${WEEKDAY_SHORT[i]}${day.active ? ' ✓' : ''}`}
          className={cn(
            'flex size-10 items-center justify-center rounded-full border-2',
            day.active ? 'border-streak bg-streak text-white' : 'border-border text-muted-foreground',
            day.future && 'border-dashed opacity-50',
            day.today && !day.active && 'border-sky'
          )}
        >
          {day.active && <Flame className="size-5" fill="currentColor" />}
        </span>
      </li>
    ))}
  </ul>
);
