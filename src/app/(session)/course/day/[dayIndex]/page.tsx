import { redirect } from 'next/navigation';

import { PracticeSession } from '@/features/course/components/practice-session';
import { startDayPracticeService } from '@/features/course/service/practice.service';
import { COURSE_ROUTE } from '@/shared/const/routes.const';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

/** An earlier course day (1-based in the URL): review it, or finish it if it was skipped. */
export default async function CourseDayPage({ params }: { params: Promise<{ dayIndex: string }> }) {
  const { dayIndex } = await params;
  const day = Number(dayIndex);
  if (!Number.isInteger(day) || day < 1) redirect(COURSE_ROUTE);

  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';
  const { data } = await startDayPracticeService(userId, day - 1);
  if ('error' in data) redirect(COURSE_ROUTE);

  return <PracticeSession initialView={data} />;
}
