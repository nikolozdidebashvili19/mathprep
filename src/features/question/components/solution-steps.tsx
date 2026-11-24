import { Lightbulb, TriangleAlert } from 'lucide-react';

import { MathText } from '@/shared/components/ui/math-text';
import { SOLUTION_COPY } from '@/shared/const/solution.const';

type SolutionStepsProps = {
  steps: string[];
  commonMistake: string | null;
  /** Open by default (e.g. after a wrong answer). */
  open: boolean;
};

/** "How is it solved?": the stored step-by-step explanation, shown only after the question was answered. */
export const SolutionSteps = ({ steps, commonMistake, open }: SolutionStepsProps) => (
  <details open={open} className="rounded-2xl border-2 border-sky/40 bg-sky/5 p-4">
    <summary className="flex cursor-pointer items-center gap-2 font-extrabold text-sky">
      <Lightbulb className="size-5" />
      {SOLUTION_COPY.title}
    </summary>
    <ol className="flex flex-col gap-2 pt-3">
      {steps.map((step, i) => (
        <li key={step} className="flex gap-2 text-sm font-semibold">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-sky/15 text-xs font-extrabold text-sky">
            {i + 1}
          </span>
          <span>
            <MathText text={step} />
          </span>
        </li>
      ))}
    </ol>
    {commonMistake && (
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-streak/10 p-3 text-sm font-semibold">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-streak" />
        <span>
          {SOLUTION_COPY.mistake}: <MathText text={commonMistake} />
        </span>
      </p>
    )}
  </details>
);
