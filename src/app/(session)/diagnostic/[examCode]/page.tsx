import { notFound } from 'next/navigation';

import { DiagnosticSession } from '@/features/diagnostic/components/diagnostic-session';
import { startDiagnosticService } from '@/features/diagnostic/service/diagnostic.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function DiagnosticSessionPage({ params }: { params: Promise<{ examCode: string }> }) {
  const { examCode } = await params;
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id;
  if (!userId) notFound();

  const { data } = await startDiagnosticService(userId, examCode);
  if ('error' in data) notFound();

  return <DiagnosticSession initialSession={data} />;
}
