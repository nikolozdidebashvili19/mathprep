import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { LessonDocument } from '@/features/course/components/lesson-document';
import { TheoryCard } from '@/features/course/components/theory-card';
import { TheoryReviewView } from '@/features/revision/types/revision.types';
import { Button } from '@/shared/components/ui/button';
import { REVISION_COPY } from '@/shared/const/revision.const';
import { REVISION_ROUTE } from '@/shared/const/routes.const';

type TheoryReviewProps = {
  review: TheoryReviewView;
};

/** Re-reading one learnt card, with previous / next to flip through the whole library. */
export const TheoryReview = ({ review }: TheoryReviewProps) => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <div className="flex items-center justify-between gap-4">
      <Button asChild variant="ghost">
        <Link href={REVISION_ROUTE}>
          <ArrowLeft className="size-4" />
          {REVISION_COPY.backToLibrary}
        </Link>
      </Button>
      <span className="text-sm font-extrabold text-muted-foreground">{REVISION_COPY.position(review.position, review.total)}</span>
    </div>

    {review.lesson ? (
      <LessonDocument key={review.code} lesson={review.lesson} skillName={review.skillName} prerequisiteNames={review.prerequisiteNames} />
    ) : (
      <TheoryCard key={review.code} skillName={review.skillName} prerequisiteNames={review.prerequisiteNames} theory={review.theory} mastery={review.mastery} />
    )}

    <nav className="grid grid-cols-2 gap-3 border-t-2 pt-6">
      {review.previous ? (
        <Button asChild variant="outline" size="lg" className="h-auto min-h-14 justify-start py-3 text-left whitespace-normal">
          <Link href={`${REVISION_ROUTE}/${review.previous.code}`}>
            <ChevronLeft className="size-5 shrink-0" />
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">{REVISION_COPY.previous}</span>
              <span>{review.previous.nameKa}</span>
            </span>
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {review.next && (
        <Button asChild variant="sky" size="lg" className="h-auto min-h-14 justify-end py-3 text-right whitespace-normal">
          <Link href={`${REVISION_ROUTE}/${review.next.code}`}>
            <span className="flex flex-col">
              <span className="text-xs opacity-80">{REVISION_COPY.next}</span>
              <span>{review.next.nameKa}</span>
            </span>
            <ChevronRight className="size-5 shrink-0" />
          </Link>
        </Button>
      )}
    </nav>
  </div>
);
