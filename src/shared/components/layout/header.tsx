'use client';
import { Sigma } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

import { useLogout } from '@/features/auth/hooks/use-logout';
import { ThemeToggle } from '@/shared/components/layout/theme-toggle';
import { Button } from '@/shared/components/ui/button';
import { APP_NAME } from '@/shared/const/app.const';
import { HOME_ROUTE_AFTER_LOGIN } from '@/shared/const/routes.const';
import { HEADER_COPY } from '@/shared/const/ui.const';

type SessionUser = {
  name?: string | null;
  avatar?: string | null;
  role?: 'admin' | 'user';
};

export const Header = () => {
  const { data: session } = useSession();
  const { logout } = useLogout();
  const sessionUser = session?.user as SessionUser | undefined;
  const userName = sessionUser?.name ?? '';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header className="flex items-center justify-between border-b-2 border-border px-4 py-4 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-edge-primary"
        >
          <Sigma className="size-5" strokeWidth={3} />
        </span>
        <span className="font-heading text-xl font-extrabold tracking-tight text-primary">
          {APP_NAME}
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {sessionUser ? (
          <>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground hover:bg-accent">
              <Link href={HOME_ROUTE_AFTER_LOGIN}>{HEADER_COPY.myPage}</Link>
            </Button>
            <div className="flex items-center gap-3">
              {sessionUser.avatar ? (
                <Image
                  src={sessionUser.avatar}
                  alt={userName}
                  width={32}
                  height={32}
                  className="size-9 rounded-full border-2 border-border object-cover"
                />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full border-2 border-border bg-sky/10 text-xs font-extrabold text-sky">
                  {initials || '?'}
                </div>
              )}
              <span className="hidden text-sm font-bold text-muted-foreground sm:block">{userName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              {HEADER_COPY.signOut}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/sign-in">{HEADER_COPY.signIn}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">{HEADER_COPY.signUp}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
};
