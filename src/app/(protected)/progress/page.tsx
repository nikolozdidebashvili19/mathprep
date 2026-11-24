import { ProgressOverview } from '@/features/progress/components/progress-overview';
import { getProgressService } from '@/features/progress/service/progress.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function ProgressPage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';
  const progress = await getProgressService(userId);

  return <ProgressOverview progress={progress} />;
}
