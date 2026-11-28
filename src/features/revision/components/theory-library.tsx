import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { MistakeNotebook } from '@/features/revision/components/mistake-notebook';
import { RevisionLibraryView, SavedMistake } from '@/features/revision/types/revision.types';
import { Button } from '@/shared/components/ui/button';
import { SegmentedBar } from '@/shared/components/ui/segmented-bar';
import { PROGRESS_BAR_SEGMENTS } from '@/shared/const/progress.const';
import { REPORT_COPY } from '@/shared/const/report.const';
import { REVISION_COPY } from '@/shared/const/revision.const';
import { PRACTICE_TODAY_ROUTE, REVISION_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';
import { MASTERY_BAND_TONES, masteryBand } from '@/shared/utils/mastery-band';

type TheoryLibraryProps = {
  library: RevisionLibraryView;
  mistakes: SavedMistake[];
};

const STAGGER = ['animate-rise-1', 'animate-rise-2', 'animate-rise-3', 'animate-rise-4'];

const EmptyLibrary = () => (
  <div className="animate-rise animate-rise-1 flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center">
    <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-sky text-sky-foreground shadow-edge-sky">
      <BookOpen className="size-7" />
    </span>
    <h2 className="text-xl">{REVISION_COPY.emptyTitle}</h2>
    <p className="max-w-md font-semibold text-muted-foreground">{REVISION_COPY.emptyBody}</p>
    <Button asChild size="lg">
      <Link href={PRACTICE_TODAY_ROUTE}>{REVISION_COPY.toCourse}</Link>
    </Button>
  </div>
);

/** Every theory card the student has read, grouped by topic (one tap opens it), and the saved mistakes folded above. */
export const TheoryLibrary = ({ library, mistakes }: TheoryLibraryProps) => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <div className="animate-rise flex flex-col gap-2">
      <h1 className="text-2xl sm:text-3xl">{REVISION_COPY.title}</h1>
      <p className="font-semibold text-muted-foreground">{REVISION_COPY.subtitle}</p>
      {library.cardCount > 0 && (
        <p className="text-sm font-extrabold text-sky">{REVISION_COPY.learntCount(library.learntCount, library.cardCount)}</p>
      )}
    </div>

    <MistakeNotebook mistakes={mistakes} />

    {library.topics.length === 0 ? (
      <EmptyLibrary />
    ) : (
      library.topics.map((topic, i) => (
        <section key={topic.code} className={cn('animate-rise flex flex-col gap-3', STAGGER[i % STAGGER.length])}>
          <h2 className="text-lg">{topic.nameKa}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topic.skills.map((skill) => {
              const band = masteryBand(skill.mastery);
              const tone = MASTERY_BAND_TONES[band];
              return (
                <li key={skill.code}>
                  <Link
                    href={`${REVISION_ROUTE}/${skill.code}`}
                    className={cn(
                      'flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card p-3 shadow-edge transition-transform',
                      'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky active:translate-y-1 active:shadow-none'
                    )}
                  >
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky/15 text-sky">
                      <BookOpen className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="font-extrabold">{skill.nameKa}</span>
                      <span className="flex items-center gap-2">
                        <SegmentedBar
                          ratio={skill.mastery ?? 0}
                          segments={PROGRESS_BAR_SEGMENTS}
                          fillClassName={tone.fill}
                          label={`${REVISION_COPY.masteryLabel}: ${skill.nameKa}`}
                          valueText={REPORT_COPY.levels[band]}
                          className="h-2.5"
                        />
                        <span className={cn('shrink-0 text-xs font-extrabold', tone.text)}>{REPORT_COPY.levels[band]}</span>
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))
    )}
  </div>
);
