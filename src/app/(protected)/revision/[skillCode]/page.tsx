import { redirect } from 'next/navigation';

import { TheoryReview } from '@/features/revision/components/theory-review';
import { getTheoryReviewService } from '@/features/revision/service/revision.service';
import { REVISION_ROUTE } from '@/shared/const/routes.const';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

type TheoryReviewPageProps = { params: Promise<{ skillCode: string }> };

export default async function TheoryReviewPage({ params }: TheoryReviewPageProps) {
  const [{ skillCode }, session] = await Promise.all([params, auth()]);
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';

  const { data } = await getTheoryReviewService(userId, decodeURIComponent(skillCode));
  if ('error' in data) redirect(REVISION_ROUTE);

  return <TheoryReview review={data} />;
}
