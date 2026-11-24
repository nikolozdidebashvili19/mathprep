'use client';
import { createContext, useContext } from 'react';
import { useStore, StoreApi } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { PracticeStore } from '@/features/course/types/course.types';

export const PracticeStoreContext = createContext<StoreApi<PracticeStore> | null>(null);

export const usePracticeStore = () => {
  const store = useContext(PracticeStoreContext);
  if (!store) throw new Error('usePracticeStore must be used within StoreProvider');
  return useStore(
    store,
    useShallow((state: PracticeStore) => ({
      view: state.view,
      index: state.index,
      selected: state.selected,
      feedback: state.feedback,
      busy: state.busy,
      error: state.error,
      summary: state.summary,
      startPractice: state.startPractice,
      select: state.select,
      markAnswered: state.markAnswered,
      next: state.next,
      back: state.back,
      setHints: state.setHints,
      setBusy: state.setBusy,
      setError: state.setError,
      setSummary: state.setSummary,
    }))
  );
};
