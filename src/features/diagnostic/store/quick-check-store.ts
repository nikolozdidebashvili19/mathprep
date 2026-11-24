import { createStore } from 'zustand/vanilla';

import { QuickCheckState, QuickCheckStore } from '@/features/diagnostic/types/diagnostic.types';

/** Object URLs keep the photo in memory until revoked, so every replacement revokes the previous one. */
const swapPhotoUrl = (previous: string | null, photo: Blob | null): string | null => {
  if (previous) URL.revokeObjectURL(previous);
  return photo ? URL.createObjectURL(photo) : null;
};

export const createQuickCheckStore = (initState: Partial<QuickCheckState> = {}) => {
  const DEFAULT_STATE: QuickCheckState = {
    view: null,
    selected: null,
    step: 'answer',
    photo: null,
    photoUrl: null,
    busy: 'idle',
    error: null,
    result: null,
  };

  return createStore<QuickCheckStore>()((set) => ({
    ...DEFAULT_STATE,
    ...initState,
    startQuickCheck: (view) =>
      set((state) => ({ ...DEFAULT_STATE, view, photoUrl: swapPhotoUrl(state.photoUrl, null) })),
    select: (selected) => set({ selected }),
    setStep: (step) => set({ step, error: null }),
    setPhoto: (photo) => set((state) => ({ photo, photoUrl: swapPhotoUrl(state.photoUrl, photo), error: null })),
    // Next question: clear the answer, the photo and the step.
    showQuestion: (view) =>
      set((state) => ({ view, selected: null, step: 'answer', photo: null, photoUrl: swapPhotoUrl(state.photoUrl, null), error: null })),
    setBusy: (busy) => set({ busy }),
    setError: (error) => set({ error }),
    setResult: (result) => set({ result }),
  }));
};
