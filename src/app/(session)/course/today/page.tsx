import { redirect } from 'next/navigation';

import { PracticeSession } from '@/features/course/components/practice-session';
import { startTodayPracticeService } from '@/features/course/service/practice.service';
import { COURSE_ROUTE } from '@/shared/const/routes.const';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function PracticeTodayPage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';

  const { data } = await startTodayPracticeService(userId);
  if ('error' in data) redirect(COURSE_ROUTE);

  return <PracticeSession initialView={data} />;
}
