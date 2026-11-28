import { BookOpen, Compass, Lightbulb, ListChecks, NotebookPen, ScanSearch, Sprout, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { StuckStep } from '@/features/course/types/course.types';
import { MathText } from '@/shared/components/ui/math-text';
import { FREE_STUCK_KINDS, HINT_COPY } from '@/shared/const/course.const';
import { cn } from '@/shared/lib/utils';

type HintListProps = {
  hints: StuckStep[];
  /** Total stages of the question: shown as "help n/total" above each stage (omit for the up-front scaffold). */
  stages?: number;
  /** Rendered right under the photo step (the camera and the analysis). */
  photoSlot?: ReactNode;
};

const ICONS: Record<StuckStep['kind'], LucideIcon> = {
  restate: Compass,
  hint: Lightbulb,
  theory: BookOpen,
  plan: ListChecks,
  example: NotebookPen,
  photo: ScanSearch,
  reinforce: Sprout,
};

const TONES: Record<StuckStep['kind'], string> = {
  restate: 'border-sky/40 bg-sky/10 text-sky',
  hint: 'border-xp/40 bg-xp/10 text-xp',
  theory: 'border-sky/40 bg-sky/10 text-sky',
  plan: 'border-sky/40 bg-sky/10 text-sky',
  example: 'border-sky/40 bg-sky/10 text-sky',
  photo: 'border-primary/40 bg-primary/10 text-primary',
  reinforce: 'border-primary/40 bg-primary/10 text-primary',
};

/** A stage's title from what it holds (stage numbers shift when a question has no teaching steps). */
const stageTitle = (steps: StuckStep[]) => {
  const has = (...kinds: StuckStep['kind'][]) => steps.some((s) => kinds.includes(s.kind));
  if (has('reinforce')) return HINT_COPY.stageTitles.easier;
  if (has('photo')) return HINT_COPY.stageTitles.photo;
  if (has('theory', 'plan', 'example')) return HINT_COPY.stageTitles.detail;
  return HINT_COPY.stageTitles.small;
};

const StepItems = ({ items }: { items: string[] }) => (
  <ol className="flex flex-col gap-1.5">
    {items.map((it, i) => (
      <li key={it} className="flex gap-2 text-sm font-semibold">
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-extrabold">{i + 1}</span>
        <span>
          <MathText text={it} />
        </span>
      </li>
    ))}
  </ol>
);

const StepCard = ({ step, label }: { step: StuckStep; label: string }) => {
  const Icon = ICONS[step.kind];
  return (
    <li className={cn('animate-pop flex items-start gap-3 rounded-2xl border-2 p-3', TONES[step.kind])}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-1 flex-col gap-1.5 text-foreground">
        <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
          {label}
          {FREE_STUCK_KINDS.includes(step.kind) && step.stage > 0 && <span className="text-xs font-bold text-muted-foreground">· {HINT_COPY.free}</span>}
        </p>
        {step.kind === 'example' ? (
          // The solved example is long: folded until the student opens it.
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-semibold underline-offset-4 hover:underline">
              <MathText text={step.text} />
            </summary>
            <div className="pt-2">
              <StepItems items={step.items} />
            </div>
          </details>
        ) : (
          <>
            <p className="text-sm font-semibold">
              <MathText text={step.text} />
            </p>
            {step.items.length > 0 && <StepItems items={step.items} />}
          </>
        )}
      </div>
    </li>
  );
};

/** "I'm stuck" steps revealed so far, grouped by stage; each stage gives more help than the one before. */
export const HintList = ({ hints, stages, photoSlot }: HintListProps) => {
  if (hints.length === 0) return null;
  const hintCount = hints.filter((h) => h.kind === 'hint').length;
  const hintNumbers = hints.map((_, i) => hints.slice(0, i + 1).filter((h) => h.kind === 'hint').length);
  const label = (step: StuckStep, i: number) =>
    step.kind === 'hint' && hintCount > 1 ? `${HINT_COPY.kinds.hint} ${hintNumbers[i]}` : HINT_COPY.kinds[step.kind];
  const stageNumbers = [...new Set(hints.map((h) => h.stage))];

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {stageNumbers.map((stage) => (
        <section key={stage} className="flex flex-col gap-2">
          {stages !== undefined && stage > 0 && (
            <p className="text-xs font-extrabold text-muted-foreground">
              {HINT_COPY.stageOf(stage, stages)} · {stageTitle(hints.filter((h) => h.stage === stage))}
            </p>
          )}
          <ol className="flex flex-col gap-2">
            {hints.map((step, i) =>
              step.stage === stage ? (
                <StepCard key={`${step.kind}-${step.text}`} step={step} label={label(step, i)} />
              ) : null
            )}
          </ol>
          {photoSlot && hints.some((h) => h.stage === stage && h.kind === 'photo') && photoSlot}
        </section>
      ))}
    </div>
  );
};
