import { Camera, Zap } from 'lucide-react';
import Link from 'next/link';

import { QuickCheckSummary } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { QUICK_CHECK_COPY } from '@/shared/const/diagnostic.const';
import { QUICK_CHECK_ROUTE } from '@/shared/const/routes.const';

type QuickCheckCardProps = {
  summary: QuickCheckSummary;
};

/** The recommended diagnostic: adaptive, 12 questions, handwriting photos. Primary green CTA (sky when resuming). */
export const QuickCheckCard = ({ summary }: QuickCheckCardProps) => {
  const cta = summary.inProgress ? QUICK_CHECK_COPY.resume : summary.lastResult ? QUICK_CHECK_COPY.retake : QUICK_CHECK_COPY.start;

  return (
    <Card className="animate-rise gap-4 border-primary py-5 shadow-edge-primary">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-edge-primary">
          <Zap className="size-7" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <p className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-extrabold text-primary">
            {QUICK_CHECK_COPY.recommended}
          </p>
          <h2 className="text-lg">{QUICK_CHECK_COPY.cardTitle}</h2>
          <p className="flex items-start gap-1.5 text-sm font-semibold text-muted-foreground">
            <Camera className="mt-0.5 size-4 shrink-0" />
            {QUICK_CHECK_COPY.cardBody}
          </p>
          {summary.inProgress && (
            <p className="text-sm font-bold text-sky">
              {summary.inProgress.answered}/{summary.inProgress.total}
            </p>
          )}
          {summary.lastResult && !summary.inProgress && (
            <p className="text-sm font-bold text-primary">
              {QUICK_CHECK_COPY.lastResult}: {summary.lastResult.correctCount}/{summary.lastResult.total}
            </p>
          )}
        </div>
        <Button asChild size="lg" variant={summary.inProgress ? 'sky' : summary.lastResult ? 'outline' : 'default'}>
          <Link href={QUICK_CHECK_ROUTE}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
