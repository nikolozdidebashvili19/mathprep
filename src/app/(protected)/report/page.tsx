import { ReportOverview } from '@/features/diagnostic/components/report-overview';
import { getReportService } from '@/features/diagnostic/service/report.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function ReportPage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';
  const { map, history } = await getReportService(userId);

  return <ReportOverview map={map} history={history} />;
}
