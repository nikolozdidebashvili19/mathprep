import Image from 'next/image';

import { SolutionSteps } from '@/features/question/components/solution-steps';
import { SavedMistake } from '@/features/revision/types/revision.types';
import { ExpandableSection } from '@/shared/components/ui/expandable-section';
import { MathText } from '@/shared/components/ui/math-text';
import { DIAGNOSTIC_COPY } from '@/shared/const/diagnostic.const';
import { REVISION_COPY } from '@/shared/const/revision.const';

type MistakeNotebookProps = {
  mistakes: SavedMistake[];
};

const optionText = (m: SavedMistake, key: string | null) => m.question.options.find((o) => o.key === key)?.text ?? '';

/**
 * Saved mistakes (T-022): one fold-out row with every question answered wrong and not solved since. Each shows the
 * student's answer, the correct one and the step-by-step solution (folded).
 */
export const MistakeNotebook = ({ mistakes }: MistakeNotebookProps) => {
  if (mistakes.length === 0) return null;
  return (
    <ExpandableSection title={REVISION_COPY.mistakesTitle} count={mistakes.length} className="animate-rise animate-rise-1">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-muted-foreground">{REVISION_COPY.mistakesIntro}</p>
        <ol className="flex flex-col gap-3">
          {mistakes.map((m) => (
            <li key={m.question.id} className="flex flex-col gap-2 rounded-2xl border-2 p-3">
              {m.skillName && <p className="text-xs font-extrabold text-sky">{m.skillName}</p>}
              <p className="font-bold">
                <MathText text={m.question.text} />
              </p>
              {m.question.imageUrls.map((url) => (
                <Image
                  key={url}
                  src={url}
                  alt={DIAGNOSTIC_COPY.figureAlt}
                  width={1200}
                  height={600}
                  unoptimized
                  className="h-auto max-h-64 w-full rounded-2xl border-2 bg-white object-contain p-2"
                />
              ))}
              <p className="text-sm font-semibold text-destructive">
                {REVISION_COPY.yourAnswer} {m.yourAnswer}) <MathText text={optionText(m, m.yourAnswer)} />
                {m.wrongCount > 1 && <span className="text-muted-foreground"> · {REVISION_COPY.wrongTimes(m.wrongCount)}</span>}
              </p>
              {m.correctAnswer && (
                <p className="text-sm font-semibold text-primary">
                  {REVISION_COPY.correctAnswer} {m.correctAnswer}) <MathText text={optionText(m, m.correctAnswer)} />
                </p>
              )}
              {m.solution && <SolutionSteps steps={m.solution.steps} commonMistake={m.solution.commonMistake} open={false} />}
            </li>
          ))}
        </ol>
      </div>
    </ExpandableSection>
  );
};
