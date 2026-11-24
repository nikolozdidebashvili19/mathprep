import { Map as MapIcon, TriangleAlert, Zap } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/shared/components/ui/button';
import { REPORT_COPY } from '@/shared/const/report.const';
import { QUICK_CHECK_ROUTE, REPORT_ROUTE } from '@/shared/const/routes.const';

type DiagnosticSummaryCardProps = {
  /** Latest finished quick check, or null before the first one. */
  latest: { sessionId: string; weak: { code: string; nameKa: string }[] } | null;
};

/** Dashboard card: the three weakest skills from the last quick check, or an invitation to take it. */
export const DiagnosticSummaryCard = ({ latest }: DiagnosticSummaryCardProps) =>
  latest ? (
    <section className="animate-rise animate-rise-2 flex flex-col gap-3 rounded-2xl border-2 bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg">
        <TriangleAlert className="size-5 text-streak" />
        {REPORT_COPY.dashboardTitle}
      </h2>
      {latest.weak.length === 0 ? (
        <p className="text-sm font-semibold text-muted-foreground">{REPORT_COPY.dashboardNoWeak}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-muted-foreground">{REPORT_COPY.dashboardWeak}:</p>
          <ul className="flex flex-wrap gap-2">
            {latest.weak.map((skill) => (
              <li key={skill.code} className="rounded-xl border-2 border-streak bg-streak/10 px-2.5 py-1 text-sm font-bold text-streak">
                {skill.nameKa}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button asChild variant="outline" className="w-fit">
        <Link href={REPORT_ROUTE}>
          <MapIcon className="size-4" />
          {REPORT_COPY.dashboardOpen}
        </Link>
      </Button>
    </section>
  ) : (
    <section className="animate-rise animate-rise-2 flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-5 shadow-edge-primary">
      <h2 className="flex items-center gap-2 text-lg">
        <Zap className="size-5 text-primary" />
        {REPORT_COPY.dashboardEmptyTitle}
      </h2>
      <p className="text-sm font-semibold text-muted-foreground">{REPORT_COPY.dashboardEmptyBody}</p>
      <Button asChild className="w-fit">
        <Link href={QUICK_CHECK_ROUTE}>{REPORT_COPY.startQuickCheck}</Link>
      </Button>
    </section>
  );
