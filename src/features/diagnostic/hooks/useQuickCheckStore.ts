'use client';
import { createContext, useContext } from 'react';
import { useStore, StoreApi } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { QuickCheckStore } from '@/features/diagnostic/types/diagnostic.types';

export const QuickCheckStoreContext = createContext<StoreApi<QuickCheckStore> | null>(null);

export const useQuickCheckStore = () => {
  const store = useContext(QuickCheckStoreContext);
  if (!store) throw new Error('useQuickCheckStore must be used within StoreProvider');
  return useStore(
    store,
    useShallow((state: QuickCheckStore) => ({
      view: state.view,
      selected: state.selected,
      step: state.step,
      photo: state.photo,
      photoUrl: state.photoUrl,
      busy: state.busy,
      error: state.error,
      result: state.result,
      startQuickCheck: state.startQuickCheck,
      select: state.select,
      setStep: state.setStep,
      setPhoto: state.setPhoto,
      showQuestion: state.showQuestion,
      setBusy: state.setBusy,
      setError: state.setError,
      setResult: state.setResult,
    }))
  );
};
