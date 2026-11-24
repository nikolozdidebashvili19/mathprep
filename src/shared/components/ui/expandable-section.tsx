import { ChevronDown } from 'lucide-react';
import { type ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

type ExpandableSectionProps = {
  title: string;
  /** Shown as a small counter next to the title (e.g. how many items are inside). */
  count?: number;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
};

/** A closed-by-default row that keeps secondary details off the screen until the student asks for them. */
export const ExpandableSection = ({ title, count, defaultOpen = false, className, children }: ExpandableSectionProps) => (
  <details open={defaultOpen} className={cn('group rounded-2xl border-2 bg-card', className)}>
    <summary
      className={cn(
        'flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 font-extrabold',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky'
      )}
    >
      <span className="flex-1">{title}</span>
      {count !== undefined && <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm text-muted-foreground">{count}</span>}
      <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4">{children}</div>
  </details>
);
