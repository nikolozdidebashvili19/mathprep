import { AuthPageShell } from '@/features/auth/components/auth-page-shell';
import { OnboardingForm } from '@/features/auth/components/onboarding-form';

export default function OnboardingPage() {
  return (
    <AuthPageShell>
      <OnboardingForm />
    </AuthPageShell>
  );
}
