import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

import { DashboardShell } from '@/shared/components/layout/dashboard-shell';
import { Header } from '@/shared/components/layout/header';
import { ONBOARDING_ROUTE } from '@/shared/const/routes.const';
import { auth } from '@/shared/lib/auth';
import { SessionProvider } from '@/shared/providers/session-provider';
import { StoreProvider } from '@/shared/providers/store-provider';

type SessionUser = {
  role?: 'admin' | 'user';
  grade?: number | null;
};

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  // Any signed-in student may enter. Admin-only areas (T-011) check the role themselves.
  if (!session) redirect('/sign-in');

  // Students must give their grade first (T-005). Admins skip onboarding.
  const sessionUser = session.user as SessionUser | undefined;
  if (sessionUser?.role !== 'admin' && !sessionUser?.grade) redirect(ONBOARDING_ROUTE);

  return (
    <SessionProvider>
      <StoreProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <DashboardShell>{children}</DashboardShell>
        </div>
      </StoreProvider>
    </SessionProvider>
  );
}
