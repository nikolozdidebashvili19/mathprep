'use client';
import { type ReactNode, useState } from 'react';
import { type StoreApi } from 'zustand';

import { AuthStoreContext } from '@/features/auth/hooks/useAuthStore';
import { createAuthStore } from '@/features/auth/store/auth-store';
import { AuthStore } from '@/features/auth/types/auth.types';
import { PracticeStoreContext } from '@/features/course/hooks/usePracticeStore';
import { createPracticeStore } from '@/features/course/store/practice-store';
import { PracticeStore } from '@/features/course/types/course.types';
import { DiagnosticStoreContext } from '@/features/diagnostic/hooks/useDiagnosticStore';
import { QuickCheckStoreContext } from '@/features/diagnostic/hooks/useQuickCheckStore';
import { createDiagnosticStore } from '@/features/diagnostic/store/diagnostic-store';
import { createQuickCheckStore } from '@/features/diagnostic/store/quick-check-store';
import { DiagnosticStore, QuickCheckStore } from '@/features/diagnostic/types/diagnostic.types';

export type StoreProviderProps = { children: ReactNode };

export const StoreProvider = ({ children }: StoreProviderProps) => {
  const [authStore] = useState<StoreApi<AuthStore>>(() => createAuthStore());
  const [diagnosticStore] = useState<StoreApi<DiagnosticStore>>(() => createDiagnosticStore());
  const [quickCheckStore] = useState<StoreApi<QuickCheckStore>>(() => createQuickCheckStore());
  const [practiceStore] = useState<StoreApi<PracticeStore>>(() => createPracticeStore());

  return (
    <AuthStoreContext.Provider value={authStore}>
      <DiagnosticStoreContext.Provider value={diagnosticStore}>
        <QuickCheckStoreContext.Provider value={quickCheckStore}>
          <PracticeStoreContext.Provider value={practiceStore}>{children}</PracticeStoreContext.Provider>
        </QuickCheckStoreContext.Provider>
      </DiagnosticStoreContext.Provider>
    </AuthStoreContext.Provider>
  );
};
