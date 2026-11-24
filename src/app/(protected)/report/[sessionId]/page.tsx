import { notFound } from 'next/navigation';

import { DiagnosticReview } from '@/features/diagnostic/components/diagnostic-review';
import { getDiagnosticReviewService } from '@/features/diagnostic/service/report.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

const OBJECT_ID = /^[a-f0-9]{24}$/;

export default async function DiagnosticReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id;
  if (!userId || !OBJECT_ID.test(sessionId)) notFound();

  const { data } = await getDiagnosticReviewService(userId, sessionId);
  if ('error' in data) notFound();

  return <DiagnosticReview review={data} />;
}
