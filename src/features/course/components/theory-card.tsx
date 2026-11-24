import { BookOpen, Lightbulb, TriangleAlert } from 'lucide-react';

import { TheoryCardView } from '@/features/course/types/course.types';
import { MathText } from '@/shared/components/ui/math-text';
import { PRACTICE_COPY, THEORY_BASICS_COLLAPSED_FROM } from '@/shared/const/course.const';

type TheoryCardProps = {
  skillName: string | null;
  prerequisiteNames: string[];
  theory: TheoryCardView | null;
  /** Student's mastery of the skill: a strong student gets the basics collapsed and the exam level first. */
  mastery: number | null;
};

type WorkedExampleProps = { title: string; example: TheoryCardView['example'] };

const WorkedExample = ({ title, example }: WorkedExampleProps) => (
  <section className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
    <h3 className="text-base">{title}</h3>
    <p className="font-bold">
      <MathText text={example.problem} />
    </p>
    <ol className="flex flex-col gap-1.5">
      {example.steps.map((step, i) => (
        <li key={step} className="flex gap-2 text-sm font-semibold">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-sky/15 text-xs font-extrabold text-sky">
            {i + 1}
          </span>
          <span>
            <MathText text={step} />
          </span>
        </li>
      ))}
    </ol>
    <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-extrabold text-primary">
      {PRACTICE_COPY.answerLabel}: <MathText text={example.answer} />
    </p>
  </section>
);

const Basics = ({ theory }: { theory: TheoryCardView }) => (
  <div className="flex flex-col gap-4">
    <section className="flex flex-col gap-1">
      <h3 className="text-base">{PRACTICE_COPY.ideaTitle}</h3>
      <p className="font-semibold leading-relaxed">
        <MathText text={theory.idea} />
      </p>
    </section>
    <section className="flex flex-col gap-2">
      <h3 className="text-base">{PRACTICE_COPY.rulesTitle}</h3>
      <ul className="flex flex-col gap-2">
        {theory.rules.map((rule) => (
          <li key={rule} className="rounded-xl border-2 border-sky/30 bg-sky/5 px-3 py-2 text-sm font-semibold">
            <MathText text={rule} />
          </li>
        ))}
      </ul>
    </section>
    <WorkedExample title={PRACTICE_COPY.exampleTitle} example={theory.example} />
  </div>
);

const ExamLevel = ({ theory }: { theory: TheoryCardView }) => (
  <div className="flex flex-col gap-4">
    <WorkedExample title={PRACTICE_COPY.examExampleTitle} example={theory.examExample} />
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-streak/40 bg-streak/5 p-4">
      <h3 className="flex items-center gap-2 text-base text-streak">
        <TriangleAlert className="size-4" />
        {PRACTICE_COPY.mistakesTitle}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {theory.mistakes.map((m) => (
          <li key={m} className="text-sm font-semibold">
            • <MathText text={m} />
          </li>
        ))}
      </ul>
    </section>
    <p className="flex items-start gap-2 rounded-2xl bg-xp/10 p-4 text-sm font-bold">
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-xp" />
      <span>
        {PRACTICE_COPY.tipTitle}: <MathText text={theory.examTip} />
      </span>
    </p>
  </div>
);

/**
 * Theory step. Two layers so it serves a beginner and a strong student: basics (idea, rules, a worked example)
 * and exam level (exam-style example, typical mistakes, tip). From THEORY_BASICS_COLLAPSED_FROM mastery the basics
 * start collapsed. Skills without a card yet get a short introduction.
 */
export const TheoryCard = ({ skillName, prerequisiteNames, theory, mastery }: TheoryCardProps) => {
  const strong = (mastery ?? 0) >= THEORY_BASICS_COLLAPSED_FROM;
  return (
    <div className="animate-rise flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sky text-sky-foreground shadow-edge-sky">
          <BookOpen className="size-6" />
        </span>
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-muted-foreground">{PRACTICE_COPY.theoryIntro}</p>
          <h1 className="text-2xl">{skillName}</h1>
        </div>
      </div>
      {prerequisiteNames.length > 0 && (
        <p className="text-sm font-semibold text-muted-foreground">
          {PRACTICE_COPY.theoryNeeds} {prerequisiteNames.join(', ')}
        </p>
      )}

      {!theory ? (
        <p className="rounded-2xl border-2 border-sky bg-sky/5 p-4 text-sm font-semibold">{PRACTICE_COPY.theorySoon}</p>
      ) : (
        <>
          <details open={!strong} className="group rounded-2xl border-2 p-4">
            <summary className="cursor-pointer text-lg font-extrabold text-sky">
              {strong ? PRACTICE_COPY.reviewBasics : PRACTICE_COPY.basicsTitle}
            </summary>
            <div className="pt-4">
              <Basics theory={theory} />
            </div>
          </details>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg text-primary">{PRACTICE_COPY.examTitle}</h2>
            <ExamLevel theory={theory} />
          </section>
        </>
      )}
    </div>
  );
};
