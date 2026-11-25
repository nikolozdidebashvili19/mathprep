'use client';
import { BookOpen, Clock } from 'lucide-react';

import { LessonSectionBlock, LessonSummary } from '@/features/course/components/lesson-sections';
import { LessonView } from '@/features/course/types/course.types';
import { MathText } from '@/shared/components/ui/math-text';
import { PRACTICE_COPY } from '@/shared/const/course.const';
import { LESSON_COPY } from '@/shared/const/lesson.const';

type LessonDocumentProps = {
  lesson: LessonView;
  skillName: string;
  prerequisiteNames: string[];
};

/** The whole lesson on one scrolling page, for revision (checks still work, nothing is recorded). */
export const LessonDocument = ({ lesson, skillName, prerequisiteNames }: LessonDocumentProps) => (
  <div className="flex flex-col gap-8">
    <div className="animate-rise flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky text-sky-foreground shadow-edge-sky">
          <BookOpen className="size-6" />
        </span>
        <div className="flex flex-col">
          <p className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            <Clock className="size-4" />
            {LESSON_COPY.minutes(lesson.minutes)}
          </p>
          <h1 className="text-2xl">{skillName}</h1>
        </div>
      </div>
      <p className="rounded-2xl border-2 bg-card p-4 font-semibold leading-relaxed">
        <MathText text={lesson.goal} />
      </p>
      {prerequisiteNames.length > 0 && (
        <p className="text-sm font-semibold text-muted-foreground">
          {PRACTICE_COPY.theoryNeeds} {prerequisiteNames.join(', ')}
        </p>
      )}
    </div>
    {lesson.sections.map((section, i) => (
      <div key={i} className="border-t-2 pt-6">
        <LessonSectionBlock section={section} />
      </div>
    ))}
    <div className="border-t-2 pt-6">
      <LessonSummary lesson={lesson} />
    </div>
  </div>
);
