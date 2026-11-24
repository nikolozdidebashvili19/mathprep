import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

import { ONBOARDING_ROUTE } from '@/shared/const/routes.const';
import { auth } from '@/shared/lib/auth';
import { SessionProvider } from '@/shared/providers/session-provider';
import { StoreProvider } from '@/shared/providers/store-provider';

type SessionUser = {
  role?: 'admin' | 'user';
  grade?: number | null;
};

/** Full-screen lesson layout (T-029): same access rules as (protected), but no header or sidebar. */
export default async function SessionLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect('/sign-in');

  const sessionUser = session.user as SessionUser | undefined;
  if (sessionUser?.role !== 'admin' && !sessionUser?.grade) redirect(ONBOARDING_ROUTE);

  return (
    <SessionProvider>
      <StoreProvider>
        <div className="min-h-screen bg-background">{children}</div>
      </StoreProvider>
    </SessionProvider>
  );
}
