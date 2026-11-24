import { cn } from '@/shared/lib/utils';

type SessionProgressBarProps = {
  total: number;
  currentIndex: number;
  answeredIds: Set<string>;
  questionIds: string[];
  label: string;
};

/** Segmented bar: one segment per question; answered = green, current = sky, rest = muted. */
export const SessionProgressBar = ({ total, currentIndex, answeredIds, questionIds, label }: SessionProgressBarProps) => (
  <div
    className="flex h-4 flex-1 gap-0.5 overflow-hidden rounded-full bg-muted"
    role="progressbar"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={total}
    aria-valuenow={answeredIds.size}
  >
    {questionIds.map((id, i) => (
      <span
        key={id}
        className={cn(
          'h-full flex-1 transition-colors',
          answeredIds.has(id) ? 'bg-primary' : 'bg-transparent',
          i === currentIndex && 'bg-sky'
        )}
      />
    ))}
  </div>
);
