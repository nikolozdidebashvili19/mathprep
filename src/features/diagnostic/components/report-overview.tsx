import { Map as MapIcon } from 'lucide-react';
import Link from 'next/link';

import { DiagnosticHistoryList } from '@/features/diagnostic/components/diagnostic-history-list';
import { KnowledgeMap as KnowledgeMapView } from '@/features/diagnostic/components/knowledge-map';
import { DiagnosticHistoryItem, KnowledgeMap } from '@/features/diagnostic/types/diagnostic.types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { REPORT_COPY } from '@/shared/const/report.const';
import { QUICK_CHECK_ROUTE, REPORT_ROUTE } from '@/shared/const/routes.const';
import { formatDate } from '@/shared/utils/format';

type ReportOverviewProps = {
  map: KnowledgeMap | null;
  history: DiagnosticHistoryItem[];
};

/** The "ცოდნის რუკა" tab: knowledge map from the latest quick check, then every finished diagnostic. */
export const ReportOverview = ({ map, history }: ReportOverviewProps) => (
  <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
    <div className="animate-rise flex flex-col gap-2">
      <h1 className="text-2xl sm:text-3xl">{REPORT_COPY.title}</h1>
      <p className="font-semibold text-muted-foreground">{REPORT_COPY.intro}</p>
      {map && (
        <Link href={`${REPORT_ROUTE}/${map.sessionId}`} className="w-fit text-sm font-bold text-sky hover:underline">
          {REPORT_COPY.basedOn}: {formatDate(map.completedAt, 'ka-GE')}
        </Link>
      )}
    </div>

    {map ? (
      <KnowledgeMapView topics={map.topics} />
    ) : (
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
    )}

    <section className="animate-rise-2 flex flex-col gap-3">
      <h2 className="text-xl">{REPORT_COPY.historyTitle}</h2>
      <DiagnosticHistoryList history={history} />
    </section>
  </div>
);
