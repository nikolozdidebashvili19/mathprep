import { TheoryLibrary } from '@/features/revision/components/theory-library';
import { getRevisionLibraryService, getSavedMistakesService } from '@/features/revision/service/revision.service';
import { auth } from '@/shared/lib/auth';

type SessionUser = { id?: string };

export default async function RevisionPage() {
  const session = await auth();
  const userId = (session?.user as SessionUser | undefined)?.id ?? '';
  const [library, mistakes] = await Promise.all([getRevisionLibraryService(userId), getSavedMistakesService(userId)]);

  return <TheoryLibrary library={library} mistakes={mistakes} />;
}
