import { BookOpen, Compass, Footprints, Lightbulb, ListChecks, NotebookPen, ScrollText, type LucideIcon } from 'lucide-react';

import { StuckStep } from '@/features/course/types/course.types';
import { MathText } from '@/shared/components/ui/math-text';
import { FREE_STUCK_KINDS, HINT_COPY } from '@/shared/const/course.const';
import { cn } from '@/shared/lib/utils';

type HintListProps = {
  hints: StuckStep[];
};

const ICONS: Record<StuckStep['kind'], LucideIcon> = {
  restate: Compass,
  theory: BookOpen,
  plan: ListChecks,
  example: NotebookPen,
  hint: Lightbulb,
  walkthrough: Footprints,
  solution: ScrollText,
};

const TONES: Record<StuckStep['kind'], string> = {
  restate: 'border-sky/40 bg-sky/10 text-sky',
  theory: 'border-sky/40 bg-sky/10 text-sky',
  plan: 'border-sky/40 bg-sky/10 text-sky',
  example: 'border-sky/40 bg-sky/10 text-sky',
  hint: 'border-xp/40 bg-xp/10 text-xp',
  walkthrough: 'border-primary/40 bg-primary/10 text-primary',
  solution: 'border-streak/40 bg-streak/10 text-streak',
};

/** The "I'm stuck" rungs revealed so far: what is asked → the steps → hints → reasoning together. */
export const HintList = ({ hints }: HintListProps) => {
  if (hints.length === 0) return null;
  const hintCount = hints.filter((h) => h.kind === 'hint').length;
  const hintNumbers = hints.map((_, i) => hints.slice(0, i + 1).filter((h) => h.kind === 'hint').length);
  return (
    <ol className="flex flex-col gap-2" aria-live="polite">
      {hints.map((step, i) => {
        const Icon = ICONS[step.kind];
        const label = step.kind === 'hint' && hintCount > 1 ? `${HINT_COPY.kinds.hint} ${hintNumbers[i]}` : HINT_COPY.kinds[step.kind];
        return (
          <li key={`${step.kind}-${step.text}`} className={cn('animate-pop flex items-start gap-3 rounded-2xl border-2 p-3', TONES[step.kind])}>
            <Icon className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5 text-foreground">
              <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
                {label}
                {FREE_STUCK_KINDS.includes(step.kind) && <span className="text-xs font-bold text-muted-foreground">· {HINT_COPY.free}</span>}
              </p>
              <p className="text-sm font-semibold">
                <MathText text={step.text} />
              </p>
              {step.items.length > 0 && (
                <ol className="flex flex-col gap-1.5">
                  {step.items.map((it, i) => (
                    <li key={it} className="flex gap-2 text-sm font-semibold">
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-extrabold">{i + 1}</span>
                      <span>
                        <MathText text={it} />
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
