'use client';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { OnboardingType } from '@/features/auth/validations/auth.validation';
import { ONBOARDING_COPY } from '@/shared/const/auth.const';
import { HOME_ROUTE_AFTER_LOGIN } from '@/shared/const/routes.const';
import { http } from '@/shared/lib/http';

export const useOnboarding = () => {
  const { setLoading, setError } = useAuthStore();

  const saveOnboarding = async (data: OnboardingType) => {
    setLoading(true);
    setError(null);
    try {
      await http.patch('/profile', data);
      // Full navigation so the server layouts read the refreshed session (grade is now set).
      window.location.href = HOME_ROUTE_AFTER_LOGIN;
    } catch {
      setError(ONBOARDING_COPY.error);
      setLoading(false);
    }
  };

  return { saveOnboarding };
};
