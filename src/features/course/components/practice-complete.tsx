import { Target, Trophy } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';
import { PRACTICE_COPY } from '@/shared/const/course.const';
import { COURSE_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';

type PracticeCompleteProps = {
  correctCount: number;
  questionCount: number;
};

/** End of the day (T-029 lesson-complete): stat tiles pop in, one primary continue. */
export const PracticeComplete = ({ correctCount, questionCount }: PracticeCompleteProps) => {
  const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;
  const tiles = [
    { icon: Trophy, label: PRACTICE_COPY.correctLabel, value: `${correctCount}/${questionCount}`, tone: 'border-xp text-xp' },
    { icon: Target, label: PRACTICE_COPY.accuracyLabel, value: `${accuracy}%`, tone: 'border-primary text-primary' },
  ];
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="animate-rise flex flex-col gap-2">
        <h1 className="text-3xl">{PRACTICE_COPY.doneTitle}</h1>
        <p className="font-semibold text-muted-foreground">{PRACTICE_COPY.doneSubtitle}</p>
      </div>
      <div className="grid w-full grid-cols-2 gap-3">
        {tiles.map(({ icon: Icon, label, value, tone }, i) => (
          <div key={label} className={cn('animate-pop flex flex-col overflow-hidden rounded-2xl border-2', tone, i === 1 && 'animate-rise-1')}>
            <p className="bg-current py-1 text-xs font-extrabold">
              <span className="text-background">{label}</span>
            </p>
            <p className="flex items-center justify-center gap-1.5 bg-card px-2 py-4 text-lg font-extrabold">
              <Icon className="size-5 shrink-0" />
              {value}
            </p>
          </div>
        ))}
      </div>
      <Button asChild size="lg" className="w-full sm:w-auto">
        <Link href={COURSE_ROUTE}>{PRACTICE_COPY.toCourse}</Link>
      </Button>
    </div>
  );
};
