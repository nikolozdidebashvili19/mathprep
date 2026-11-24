import { cn } from '@/shared/lib/utils';

type SegmentedBarProps = {
  /** 0..1, how much of the bar is filled. */
  ratio: number;
  segments: number;
  fillClassName: string;
  label: string;
  valueText?: string;
  className?: string;
};

/** Chunky segmented progress bar (T-029: progress as chunky bars, not thin charts). */
export const SegmentedBar = ({ ratio, segments, fillClassName, label, valueText, className }: SegmentedBarProps) => {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const filled = clamped > 0 ? Math.max(1, Math.round(clamped * segments)) : 0;
  return (
    <div
      className={cn('flex h-4 flex-1 gap-0.5 overflow-hidden rounded-full bg-muted', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuetext={valueText}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className={cn('h-full flex-1', i < filled ? fillClassName : 'bg-transparent')} />
      ))}
    </div>
  );
};
