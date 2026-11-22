import { KnowledgeMapTopic, SkillLevel } from '@/features/diagnostic/types/diagnostic.types';
import { REPORT_COPY } from '@/shared/const/report.const';
import { cn } from '@/shared/lib/utils';

type KnowledgeMapProps = {
  topics: KnowledgeMapTopic[];
};

/** Accent only where there is evidence: amber = weak, sky = mixed, green = strong, muted = not tested yet. */
const LEVEL_STYLES: Record<SkillLevel, string> = {
  weak: 'border-streak bg-streak/10 text-streak',
  mixed: 'border-sky bg-sky/10 text-sky',
  strong: 'border-primary bg-primary/10 text-primary',
  untested: 'border-border border-dashed bg-transparent text-muted-foreground',
};

const LEGEND: SkillLevel[] = ['weak', 'mixed', 'strong', 'untested'];

const STAGGER = ['animate-rise-1', 'animate-rise-2', 'animate-rise-3', 'animate-rise-4'];

/** Every skill grouped by topic, coloured by its level in the latest quick check. */
export const KnowledgeMap = ({ topics }: KnowledgeMapProps) => (
  <div className="flex flex-col gap-4">
    <ul className="flex flex-wrap gap-2" aria-label={REPORT_COPY.title}>
      {LEGEND.map((level) => (
        <li key={level} className={cn('rounded-full border-2 px-3 py-1 text-xs font-extrabold', LEVEL_STYLES[level])}>
          {REPORT_COPY.levels[level]}
        </li>
      ))}
    </ul>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {topics.map((topic, i) => (
        <section key={topic.code} className={cn('animate-rise flex flex-col gap-3 rounded-2xl border-2 bg-card p-4', STAGGER[i % STAGGER.length])}>
          <h3 className="text-base">{topic.nameKa}</h3>
          <ul className="flex flex-wrap gap-2">
            {topic.skills.map((skill) => (
              <li
                key={skill.code}
                title={REPORT_COPY.levels[skill.level]}
                className={cn('rounded-xl border-2 px-2.5 py-1 text-sm font-bold', LEVEL_STYLES[skill.level])}
              >
                {skill.nameKa}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </div>
);
