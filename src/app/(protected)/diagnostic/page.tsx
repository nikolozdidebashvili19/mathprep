import { DiagnosticExamList } from '@/features/diagnostic/components/diagnostic-exam-list';
import { listDiagnosticExamsService } from '@/features/diagnostic/service/diagnostic.service';
import { getQuickCheckSummaryService } from '@/features/diagnostic/service/quick-check.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function DiagnosticPage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';
  const [{ data }, quickCheck] = await Promise.all([listDiagnosticExamsService(userId), getQuickCheckSummaryService(userId)]);

  return <DiagnosticExamList exams={Array.isArray(data) ? data : []} quickCheck={quickCheck} />;
}
