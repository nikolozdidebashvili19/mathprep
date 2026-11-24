'use client';
import { RotateCcw } from 'lucide-react';

import { useAbandonCourse } from '@/features/course/hooks/use-abandon-course';
import { Button } from '@/shared/components/ui/button';
import { COURSE_COPY } from '@/shared/const/course.const';

/** Ends the course (after a confirm) so a new one can be set up, e.g. after another diagnostic. */
export const ReplanButton = () => {
  const { abandon, pending, error } = useAbandonCourse();
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" onClick={() => void abandon()} disabled={pending}>
        <RotateCcw className="size-4" />
        {COURSE_COPY.replan}
      </Button>
      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
    </div>
  );
};
