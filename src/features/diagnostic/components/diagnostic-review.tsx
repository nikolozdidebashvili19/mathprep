import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { ReviewQuestionCard } from '@/features/diagnostic/components/review-question-card';
import { SkillResultLists } from '@/features/diagnostic/components/skill-result-lists';
import { DiagnosticReview as DiagnosticReviewData } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { REPORT_COPY } from '@/shared/const/report.const';
import { REPORT_ROUTE } from '@/shared/const/routes.const';
import { formatDateTime } from '@/shared/utils/format';

type DiagnosticReviewProps = {
  review: DiagnosticReviewData;
};

/** A finished diagnostic: summary, weak/strong skills (quick check), then every question with photo + analysis. */
export const DiagnosticReview = ({ review }: DiagnosticReviewProps) => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
    <div className="animate-rise flex flex-col gap-3">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={REPORT_ROUTE}>
          <ArrowLeft className="size-4" />
          {REPORT_COPY.backToReport}
        </Link>
      </Button>
      <h1 className="text-2xl sm:text-3xl">
        {review.kind === 'quick' ? REPORT_COPY.quickCheck : `${REPORT_COPY.fullMock} ${review.examCode ?? ''}`}
      </h1>
      <p className="font-semibold text-muted-foreground">
        {formatDateTime(review.completedAt, 'ka-GE')} · {review.correctCount}/{review.total} {REPORT_COPY.correctOf} · {review.score}/
        {review.maxScore} {REPORT_COPY.points}
      </p>
    </div>

    {review.kind === 'quick' && <SkillResultLists weak={review.weak} strong={review.strong} />}

    <section className="flex flex-col gap-4">
      <h2 className="text-xl">{REPORT_COPY.questionsTitle}</h2>
      {review.items.map((item, i) => (
        <ReviewQuestionCard key={item.question.id} item={item} index={i} />
      ))}
    </section>
  </div>
);
