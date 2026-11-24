import { redirect } from 'next/navigation';
import { type ReactNode } from 'react';

import { HOME_ROUTE_AFTER_LOGIN } from '@/shared/const/routes.const';
import { auth } from '@/shared/lib/auth';
import { SessionProvider } from '@/shared/providers/session-provider';
import { StoreProvider } from '@/shared/providers/store-provider';

type SessionUser = {
  grade?: number | null;
};

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect('/sign-in');

  const sessionUser = session.user as SessionUser | undefined;
  if (sessionUser?.grade) redirect(HOME_ROUTE_AFTER_LOGIN);

  return (
    <SessionProvider>
      <StoreProvider>{children}</StoreProvider>
    </SessionProvider>
  );
}
