'use client';
import { signIn, getSession } from 'next-auth/react';

import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { User } from '@/features/auth/types/auth.types';
import { LoginType } from '@/features/auth/validations/auth.validation';
import { AUTH_ERROR_MESSAGES, AUTH_FALLBACK_ERRORS } from '@/shared/const/auth.const';
import { HOME_ROUTE_AFTER_LOGIN } from '@/shared/const/routes.const';


export const useLogin = () => {
  const { setUser, setLoading, setError } = useAuthStore();

  const handleSession = async (setUserFn: typeof setUser) => {
    const session = await getSession();
    const sessionUser = session?.user as User | undefined;
    if (!sessionUser) return;

    setUserFn({
      id: sessionUser.id ?? '',
      name: sessionUser.name ?? '',
      email: sessionUser.email ?? '',
      role: sessionUser.role ?? 'user',
      avatar: sessionUser.avatar ?? '',
    });

    window.location.href = HOME_ROUTE_AFTER_LOGIN;
  };

  const login = async (data: LoginType) => {
    setLoading(true);
    setError(null);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
        return;
      }

      if (result?.ok) {
        await handleSession(setUser);
      }
    } catch {
      setError(AUTH_FALLBACK_ERRORS.login);
    } finally {
      setLoading(false);
    }
  };

  return { login };
};
