import { Lightbulb } from 'lucide-react';

import { MathText } from '@/shared/components/ui/math-text';
import { HINT_COPY } from '@/shared/const/course.const';

type HintListProps = {
  hints: string[];
  total: number;
};

/** Hints revealed so far for the current question (each came from the server on request). */
export const HintList = ({ hints, total }: HintListProps) =>
  hints.length === 0 ? null : (
    <ol className="flex flex-col gap-2">
      {hints.map((hint, i) => (
        <li key={hint} className="animate-pop flex items-start gap-2 rounded-2xl border-2 border-xp/40 bg-xp/10 p-3 text-sm font-semibold">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-xp" />
          <span>
            <span className="font-extrabold">{HINT_COPY.label(i + 1, total)}: </span>
            <MathText text={hint} />
          </span>
        </li>
      ))}
    </ol>
  );
