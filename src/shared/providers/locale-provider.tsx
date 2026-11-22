'use client';
import { type ReactNode } from 'react';
import { z } from 'zod';

// Form validation messages (react-hook-form + zodResolver) are shown in Georgian.
z.config(z.locales.ka());

export function LocaleProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
