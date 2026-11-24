import { TheoryLibrary } from '@/features/revision/components/theory-library';
import { getRevisionLibraryService } from '@/features/revision/service/revision.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function RevisionPage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';
  const library = await getRevisionLibraryService(userId);

  return <TheoryLibrary library={library} />;
}
