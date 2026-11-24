'use client';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { SignUpType } from '@/features/auth/validations/auth.validation';
import { AUTH_ERROR_MESSAGES, AUTH_FALLBACK_ERRORS } from '@/shared/const/auth.const';
import { http } from '@/shared/lib/http';

export const useRegister = () => {
  const { setLoading, setError } = useAuthStore();
  const router = useRouter();

  const register = async (data: SignUpType) => {
    setLoading(true);
    setError(null);
    try {
      await http.post('/auth/register', data);
      router.push('/sign-in');
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setError(AUTH_ERROR_MESSAGES[code] ?? AUTH_FALLBACK_ERRORS.register);
    } finally {
      setLoading(false);
    }
  };

  return { register };
};
