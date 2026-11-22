import { Check, CircleHelp, Sparkles, X } from 'lucide-react';
import Image from 'next/image';

import { ReviewAnalysis, ReviewItem } from '@/features/diagnostic/types/diagnostic.types';
import { SolutionSteps } from '@/features/question/components/solution-steps';
import { MathText } from '@/shared/components/ui/math-text';
import { DIAGNOSTIC_COPY } from '@/shared/const/diagnostic.const';
import { REPORT_COPY } from '@/shared/const/report.const';
import { cn } from '@/shared/lib/utils';

type ReviewQuestionCardProps = {
  item: ReviewItem;
  index: number;
};

const optionText = (item: ReviewItem, key: string) => item.question.options.find((o) => o.key === key)?.text ?? key;

const AnalysisBlock = ({ analysis }: { analysis: ReviewAnalysis }) => {
  if (analysis.status === 'pending') return <p className="text-sm font-semibold text-muted-foreground">{REPORT_COPY.aiPending}</p>;
  if (analysis.status === 'failed') return <p className="text-sm font-semibold text-muted-foreground">{REPORT_COPY.aiFailed}</p>;
  if (analysis.readable === false) return <p className="text-sm font-semibold text-muted-foreground">{REPORT_COPY.aiUnreadable}</p>;

  return (
    <div className="flex flex-col gap-2">
      {analysis.approach && <p className="text-sm font-semibold text-muted-foreground">{analysis.approach}</p>}
      {analysis.mistakes.length === 0 ? (
        <p className="text-sm font-bold text-primary">{REPORT_COPY.noMistakes}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {analysis.mistakes.map((m) => (
            <li key={`${m.type}-${m.description}`} className="rounded-xl border-2 border-streak/40 bg-streak/5 p-3 text-sm">
              <p className="font-extrabold text-streak">
                {REPORT_COPY.mistakeTypes[m.type]} · {m.skillName}
              </p>
              <p className="font-semibold">{m.description}</p>
            </li>
          ))}
        </ul>
      )}
      {analysis.feedback && <p className="rounded-xl bg-sky/10 p-3 text-sm font-bold text-sky">{analysis.feedback}</p>}
    </div>
  );
};

/** One question of a finished diagnostic: statement, the student's vs the correct answer, the photo and its analysis. */
export const ReviewQuestionCard = ({ item, index }: ReviewQuestionCardProps) => {
  const skipped = item.givenAnswer === '';
  const status = skipped
    ? { icon: CircleHelp, label: REPORT_COPY.skipped, tone: 'border-border text-muted-foreground' }
    : item.correct
      ? { icon: Check, label: REPORT_COPY.correct, tone: 'border-primary text-primary' }
      : { icon: X, label: REPORT_COPY.wrong, tone: 'border-destructive text-destructive' };
  const StatusIcon = status.icon;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-sky">
          {REPORT_COPY.question} {index + 1}
        </p>
        <span className={cn('inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-xs font-extrabold', status.tone)}>
          <StatusIcon className="size-3.5" />
          {status.label}
        </span>
      </div>

      <p className="font-bold">
        <MathText text={item.question.text} />
      </p>
      {item.question.imageUrls.map((url) => (
        <Image
          key={url}
          src={url}
          alt={DIAGNOSTIC_COPY.figureAlt}
          width={1200}
          height={600}
          unoptimized
          className="h-auto max-h-64 w-full rounded-xl border-2 bg-white object-contain p-2"
        />
      ))}

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className={cn('rounded-xl border-2 p-3', skipped ? 'border-border' : item.correct ? 'border-primary' : 'border-destructive')}>
          <dt className="font-bold text-muted-foreground">{REPORT_COPY.yourAnswer}</dt>
          <dd className="font-extrabold">
            {skipped ? REPORT_COPY.dontKnow : (
              <>
                {item.givenAnswer}) <MathText text={optionText(item, item.givenAnswer)} />
              </>
            )}
          </dd>
        </div>
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-3">
          <dt className="font-bold text-muted-foreground">{REPORT_COPY.correctAnswer}</dt>
          <dd className="font-extrabold">
            {item.correctAnswer}) <MathText text={optionText(item, item.correctAnswer)} />
          </dd>
        </div>
      </dl>

      {item.solution && <SolutionSteps steps={item.solution.steps} commonMistake={item.solution.commonMistake} open={!item.correct} />}

      {item.photoUrl && (
        <div className="grid grid-cols-1 gap-4 border-t-2 pt-4 sm:grid-cols-2">
          <Image
            src={item.photoUrl}
            alt={REPORT_COPY.photoAlt}
            width={800}
            height={1000}
            unoptimized
            className="h-auto max-h-80 w-full rounded-xl border-2 bg-white object-contain"
          />
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 font-extrabold">
              <Sparkles className="size-4 text-sky" />
              {REPORT_COPY.aiTitle}
            </p>
            {item.analysis && <AnalysisBlock analysis={item.analysis} />}
          </div>
        </div>
      )}
    </article>
  );
};
