import { Map as MapIcon, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { DiagnosticHistoryList } from '@/features/diagnostic/components/diagnostic-history-list';
import { KnowledgeMap as KnowledgeMapView } from '@/features/diagnostic/components/knowledge-map';
import { DiagnosticHistoryItem, KnowledgeMap, SkillLevel } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { ExpandableSection } from '@/shared/components/ui/expandable-section';
import { REPORT_COPY } from '@/shared/const/report.const';
import { QUICK_CHECK_ROUTE, REPORT_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';
import { formatDate } from '@/shared/utils/format';

type ReportOverviewProps = {
  map: KnowledgeMap | null;
  history: DiagnosticHistoryItem[];
};

const COUNT_TILES: { level: SkillLevel; tone: string }[] = [
  { level: 'weak', tone: 'border-streak text-streak' },
  { level: 'mixed', tone: 'border-sky text-sky' },
  { level: 'strong', tone: 'border-primary text-primary' },
];

const STAGGER = ['', 'animate-rise-1', 'animate-rise-2'];

const EmptyMap = () => (
  <Card className="animate-rise-1">
    <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-sky text-sky-foreground shadow-edge-sky">
        <MapIcon className="size-7" />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <h2 className="text-lg">{REPORT_COPY.emptyTitle}</h2>
        <p className="text-sm font-semibold text-muted-foreground">{REPORT_COPY.emptyBody}</p>
      </div>
      <Button asChild size="lg">
        <Link href={QUICK_CHECK_ROUTE}>{REPORT_COPY.startQuickCheck}</Link>
      </Button>
    </CardContent>
  </Card>
);

/**
 * The "ცოდნის რუკა" tab, kept simple: how many skills are weak / medium / strong, the weak ones to work on,
 * and the full map plus past diagnostics folded away until asked for.
 */
export const ReportOverview = ({ map, history }: ReportOverviewProps) => {
  const skills = map ? map.topics.flatMap((t) => t.skills) : [];
  const count = (level: SkillLevel) => skills.filter((s) => s.level === level).length;
  const weak = skills.filter((s) => s.level === 'weak');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="animate-rise flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl">{REPORT_COPY.title}</h1>
        {map && (
          <Link href={`${REPORT_ROUTE}/${map.sessionId}`} className="w-fit text-sm font-bold text-sky hover:underline">
            {REPORT_COPY.basedOn}: {formatDate(map.completedAt, 'ka-GE')}
          </Link>
        )}
      </div>

      {!map ? (
        <EmptyMap />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {COUNT_TILES.map(({ level, tone }, i) => (
              <div key={level} className={cn('animate-pop flex flex-col items-center gap-1 rounded-2xl border-2 bg-card p-4', tone, STAGGER[i])}>
                <span className="text-3xl font-extrabold">{count(level)}</span>
                <span className="text-sm font-extrabold">{REPORT_COPY.levels[level]}</span>
              </div>
            ))}
          </div>

          <section className="animate-rise animate-rise-2 flex flex-col gap-3 rounded-2xl border-2 bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg">
              <TriangleAlert className="size-5 text-streak" />
              {REPORT_COPY.workOnTitle}
            </h2>
            {weak.length === 0 ? (
              <p className="text-sm font-semibold text-muted-foreground">{REPORT_COPY.dashboardNoWeak}</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {weak.map((skill) => (
                  <li key={skill.code} className="rounded-xl border-2 border-streak bg-streak/10 px-2.5 py-1 text-sm font-bold text-streak">
                    {skill.nameKa}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="animate-rise animate-rise-3 flex flex-col gap-3">
        {map && (
          <ExpandableSection title={REPORT_COPY.fullMapTitle} count={skills.length}>
            <KnowledgeMapView topics={map.topics} />
          </ExpandableSection>
        )}
        <ExpandableSection title={REPORT_COPY.historyTitle} count={history.length}>
          <DiagnosticHistoryList history={history} />
        </ExpandableSection>
      </div>
    </div>
  );
};
