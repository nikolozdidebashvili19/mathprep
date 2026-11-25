import { createStore } from 'zustand/vanilla';

import { PracticeState, PracticeStore } from '@/features/course/types/course.types';

export const createPracticeStore = (initState: Partial<PracticeState> = {}) => {
  const DEFAULT_STATE: PracticeState = {
    view: null,
    index: 0,
    selected: null,
    feedback: null,
    busy: false,
    error: null,
    summary: null,
  };

  return createStore<PracticeStore>()((set) => ({
    ...DEFAULT_STATE,
    ...initState,
    // A finished day opens at the start for review; otherwise resume at the first item not answered yet.
    startPractice: (view) => {
      const firstOpen = view.items.findIndex((i) => !i.answered);
      set({ ...DEFAULT_STATE, view, index: view.completed || firstOpen === -1 ? 0 : firstOpen });
    },
    setHints: (index, hints) =>
      set((state) =>
        state.view ? { view: { ...state.view, items: state.view.items.map((item, i) => (i === index ? { ...item, hints } : item)) } } : {}
      ),
    insertItem: (position, item) =>
      set((state) => {
        if (!state.view) return {};
        const items = [...state.view.items.slice(0, position), item, ...state.view.items.slice(position)].map((it, i) => ({ ...it, index: i }));
        return { view: { ...state.view, items } };
      }),
    back: () => set((state) => ({ index: Math.max(0, state.index - 1), selected: null, feedback: null, error: null })),
    select: (selected) => set({ selected }),
    markAnswered: (index, answer, feedback) =>
      set((state) =>
        state.view
          ? {
            feedback,
            view: {
              ...state.view,
              items: state.view.items.map((item, i) =>
                i === index
                  ? {
                    ...item,
                    answered: true,
                    answer,
                    correct: feedback.correct,
                    correctAnswer: feedback.correctAnswer,
                    solution: feedback.solution,
                    reteach: feedback.reteach,
                  }
                  : item
              ),
            },
          }
          : {}
      ),
    next: () => set((state) => ({ index: state.index + 1, selected: null, feedback: null, error: null })),
    setBusy: (busy) => set({ busy }),
    setError: (error) => set({ error }),
    setSummary: (summary) => set({ summary }),
  }));
};
