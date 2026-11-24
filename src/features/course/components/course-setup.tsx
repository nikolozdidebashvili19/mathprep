'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { TriangleAlert } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import { useCreateCourse } from '@/features/course/hooks/use-create-course';
import { CoursePreview } from '@/features/course/types/course.types';
import { CreateCourseSchema, CreateCourseType } from '@/features/course/validations/course.validation';
import { Button } from '@/shared/components/ui/button';
import { Form, FormField, FormItem, FormLabel } from '@/shared/components/ui/form';
import { COURSE_COPY } from '@/shared/const/course.const';
import { COURSE_DURATION_MONTHS, DAILY_MINUTES_OPTIONS } from '@/shared/const/domain.const';
import { cn } from '@/shared/lib/utils';

type CourseSetupProps = {
  previews: CoursePreview[];
};

const TILE = 'h-16 text-base font-extrabold';
const TILE_SELECTED = 'border-sky bg-sky/10 text-sky shadow-edge-sky hover:bg-sky/15';

const PreviewPanel = ({ preview }: { preview: CoursePreview }) => {
  const total = preview.skillCount + preview.omittedCount;
  return (
    <section className="animate-rise flex flex-col gap-4 rounded-2xl border-2 bg-card p-5" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg">{COURSE_COPY.previewTitle}</h2>
        <p className="text-sm font-extrabold text-primary">{COURSE_COPY.skillsCovered(preview.skillCount, total)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs font-bold text-muted-foreground">
          <span>{COURSE_COPY.coverageLabel}</span>
          <span>{Math.round(preview.coverage * 100)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full bg-primary transition-all', COVERAGE_WIDTH[Math.round(preview.coverage * 10)])} />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {preview.topics.map((t) => (
          <li key={t.code} className="flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-sm">
            <span className="font-bold">{t.nameKa}</span>
            <span className={cn('font-extrabold', t.covered === t.needed ? 'text-primary' : t.covered === 0 ? 'text-muted-foreground' : 'text-sky')}>
              {t.covered}/{t.needed}
            </span>
          </li>
        ))}
      </ul>

      {!preview.realistic && (
        <p className="flex items-start gap-2 rounded-xl border-2 border-streak bg-streak/10 p-3 text-sm font-bold text-streak">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {COURSE_COPY.unrealistic}
        </p>
      )}
      {preview.omittedNames.length > 0 && (
        <p className="text-sm font-semibold text-muted-foreground">
          {COURSE_COPY.leftOut}: {preview.omittedNames.join(', ')}
          {preview.omittedCount > preview.omittedNames.length && ' …'}
        </p>
      )}
    </section>
  );
};

/** Width classes for the coverage bar in 10% steps (no arbitrary values, no inline styles). */
const COVERAGE_WIDTH = ['w-0', 'w-1/10', 'w-2/10', 'w-3/10', 'w-4/10', 'w-5/10', 'w-6/10', 'w-7/10', 'w-8/10', 'w-9/10', 'w-full'];

/** T-019: duration × daily time as big tiles, a live preview of what the plan covers, then "start the course". */
export const CourseSetup = ({ previews }: CourseSetupProps) => {
  const form = useForm<CreateCourseType>({
    resolver: zodResolver(CreateCourseSchema),
    defaultValues: { months: 3, minutesPerDay: 60 },
  });
  const { createCourse } = useCreateCourse(form);
  const [months, minutesPerDay] = useWatch({ control: form.control, name: ['months', 'minutesPerDay'] });
  const preview = previews.find((p) => p.months === months && p.minutesPerDay === minutesPerDay);
  const { isSubmitting, errors } = form.formState;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="animate-rise flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl">{COURSE_COPY.setupTitle}</h1>
        <p className="font-semibold text-muted-foreground">{COURSE_COPY.setupIntro}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(createCourse)} className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="months"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-extrabold">{COURSE_COPY.durationLabel}</FormLabel>
                <div role="radiogroup" aria-label={COURSE_COPY.durationLabel} className="grid grid-cols-3 gap-3">
                  {COURSE_DURATION_MONTHS.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={field.value === m}
                      variant="outline"
                      onClick={() => field.onChange(m)}
                      className={cn(TILE, field.value === m && TILE_SELECTED)}
                    >
                      {COURSE_COPY.monthsUnit(m)}
                    </Button>
                  ))}
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minutesPerDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-extrabold">{COURSE_COPY.dailyLabel}</FormLabel>
                <div role="radiogroup" aria-label={COURSE_COPY.dailyLabel} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DAILY_MINUTES_OPTIONS.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={field.value === m}
                      variant="outline"
                      onClick={() => field.onChange(m)}
                      className={cn(TILE, field.value === m && TILE_SELECTED)}
                    >
                      {m} {COURSE_COPY.minutesUnit}
                    </Button>
                  ))}
                </div>
              </FormItem>
            )}
          />

          {preview && <PreviewPanel key={`${months}-${minutesPerDay}`} preview={preview} />}

          {errors.root && <p className="text-sm font-bold text-destructive">{errors.root.message}</p>}
          <Button type="submit" size="lg" disabled={isSubmitting} className="sm:self-end">
            {isSubmitting ? COURSE_COPY.creating : COURSE_COPY.create}
          </Button>
        </form>
      </Form>
    </div>
  );
};
