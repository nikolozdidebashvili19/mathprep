'use client';
import { createContext, useContext } from 'react';
import { useStore, StoreApi } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { DiagnosticStore } from '@/features/diagnostic/types/diagnostic.types';

export const DiagnosticStoreContext = createContext<StoreApi<DiagnosticStore> | null>(null);

export const useDiagnosticStore = () => {
  const store = useContext(DiagnosticStoreContext);
  if (!store) throw new Error('useDiagnosticStore must be used within StoreProvider');
  return useStore(
    store,
    useShallow((state: DiagnosticStore) => ({
      session: state.session,
      currentIndex: state.currentIndex,
      selected: state.selected,
      saving: state.saving,
      error: state.error,
      result: state.result,
      startSession: state.startSession,
      select: state.select,
      recordAnswer: state.recordAnswer,
      goTo: state.goTo,
      setSaving: state.setSaving,
      setError: state.setError,
      setResult: state.setResult,
    }))
  );
};
