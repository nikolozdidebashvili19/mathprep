import { notFound } from 'next/navigation';

import { QuickCheckSession } from '@/features/diagnostic/components/quick-check-session';
import { startQuickCheckService } from '@/features/diagnostic/service/quick-check.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function QuickCheckPage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id;
  if (!userId) notFound();

  const { data } = await startQuickCheckService(userId);
  if ('error' in data) notFound();

  return <QuickCheckSession initialView={data} />;
}
