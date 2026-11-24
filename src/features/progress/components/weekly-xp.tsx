import { WeekXp } from '@/features/progress/types/progress.types';
import { SegmentedBar } from '@/shared/components/ui/segmented-bar';
import { PROGRESS_BAR_SEGMENTS, PROGRESS_COPY } from '@/shared/const/progress.const';
import { cn } from '@/shared/lib/utils';

type WeeklyXpProps = {
  weeks: WeekXp[];
};

/** XP per week as chunky bars, scaled to the best week; the current week is highlighted. */
export const WeeklyXp = ({ weeks }: WeeklyXpProps) => {
  const best = Math.max(1, ...weeks.map((w) => w.xp));
  return (
    <ul className="flex flex-col gap-3">
      {[...weeks].reverse().map((week) => {
        const label = week.weeksAgo === 0 ? PROGRESS_COPY.thisWeek : PROGRESS_COPY.weeksAgo(week.weeksAgo);
        return (
          <li key={week.weeksAgo} className="flex items-center gap-3">
            <span className={cn('w-24 shrink-0 text-sm font-bold', week.weeksAgo === 0 ? 'text-foreground' : 'text-muted-foreground')}>{label}</span>
            <SegmentedBar
              ratio={week.xp / best}
              segments={PROGRESS_BAR_SEGMENTS}
              fillClassName={week.weeksAgo === 0 ? 'bg-xp' : 'bg-xp/50'}
              label={label}
              valueText={`${week.xp} XP`}
            />
            <span className="w-16 shrink-0 text-right text-sm font-extrabold text-xp">{week.xp} XP</span>
          </li>
        );
      })}
    </ul>
  );
};
