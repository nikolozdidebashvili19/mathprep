import { ChevronRight, ClipboardCheck, Zap } from 'lucide-react';
import Link from 'next/link';

import { DiagnosticHistoryItem } from '@/features/diagnostic/types/diagnostic.types';
import { REPORT_COPY } from '@/shared/const/report.const';
import { REPORT_ROUTE } from '@/shared/const/routes.const';
import { cn } from '@/shared/lib/utils';
import { formatDateTime } from '@/shared/utils/format';

type DiagnosticHistoryListProps = {
  history: DiagnosticHistoryItem[];
};

/** Finished diagnostics, newest first; each row opens the question-by-question review. Rendered on the server. */
export const DiagnosticHistoryList = ({ history }: DiagnosticHistoryListProps) =>
  history.length === 0 ? (
    <p className="rounded-2xl border-2 bg-card p-4 font-semibold text-muted-foreground">{REPORT_COPY.historyEmpty}</p>
  ) : (
    <ul className="flex flex-col gap-3">
      {history.map((item) => {
        const quick = item.kind === 'quick';
        const Icon = quick ? Zap : ClipboardCheck;
        return (
          <li key={item.id}>
            <Link
              href={`${REPORT_ROUTE}/${item.id}`}
              className={cn(
                'flex items-center gap-4 rounded-2xl border-2 bg-card p-4 shadow-edge transition-colors',
                'hover:bg-muted active:translate-y-1 active:shadow-none'
              )}
            >
              <span
                className={cn(
                  'inline-flex size-11 shrink-0 items-center justify-center rounded-xl',
                  quick ? 'bg-primary text-primary-foreground' : 'bg-sky text-sky-foreground'
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="font-extrabold">
                  {quick ? REPORT_COPY.quickCheck : `${REPORT_COPY.fullMock} ${item.examCode ?? ''}`}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{formatDateTime(item.completedAt, 'ka-GE')}</span>
              </span>
              <span className="text-right text-sm font-extrabold">
                {item.correctCount}/{item.total}
                <span className="block text-xs font-semibold text-muted-foreground">{REPORT_COPY.correctOf}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
