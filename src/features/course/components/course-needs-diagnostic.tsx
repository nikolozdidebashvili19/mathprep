import { ClipboardList } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { COURSE_COPY } from '@/shared/const/course.const';
import { QUICK_CHECK_ROUTE } from '@/shared/const/routes.const';

/** /course before the first diagnostic: the plan needs weaknesses to start from. */
export const CourseNeedsDiagnostic = () => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <h1 className="animate-rise text-2xl sm:text-3xl">{COURSE_COPY.setupTitle}</h1>
    <Card className="animate-rise-1">
      <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky text-sky-foreground shadow-edge-sky">
          <ClipboardList className="size-7" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-lg">{COURSE_COPY.needsDiagnosticTitle}</h2>
          <p className="text-sm font-semibold text-muted-foreground">{COURSE_COPY.needsDiagnosticBody}</p>
        </div>
        <Button asChild size="lg">
          <Link href={QUICK_CHECK_ROUTE}>{COURSE_COPY.needsDiagnosticCta}</Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);
