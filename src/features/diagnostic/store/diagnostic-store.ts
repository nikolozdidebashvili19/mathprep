import { createStore } from 'zustand/vanilla';

import { DiagnosticState, DiagnosticStore } from '@/features/diagnostic/types/diagnostic.types';

export const createDiagnosticStore = (initState: Partial<DiagnosticState> = {}) => {
  const DEFAULT_STATE: DiagnosticState = {
    session: null,
    currentIndex: 0,
    selected: null,
    saving: false,
    error: null,
    result: null,
  };

  return createStore<DiagnosticStore>()((set) => ({
    ...DEFAULT_STATE,
    ...initState,
    startSession: (session) => {
      // Resume at the first unanswered question.
      const firstOpen = session.questions.findIndex((q) => !(q.id in session.answers));
      const currentIndex = firstOpen === -1 ? Math.max(session.questions.length - 1, 0) : firstOpen;
      const current = session.questions[currentIndex];
      set({ session, currentIndex, selected: current ? session.answers[current.id] || null : null, result: null, error: null });
    },
    select: (selected) => set({ selected }),
    recordAnswer: (questionId, answer) =>
      set((state) =>
        state.session ? { session: { ...state.session, answers: { ...state.session.answers, [questionId]: answer } } } : {}
      ),
    goTo: (index) =>
      set((state) => {
        const question = state.session?.questions[index];
        return { currentIndex: index, selected: question ? state.session?.answers[question.id] || null : null };
      }),
    setSaving: (saving) => set({ saving }),
    setError: (error) => set({ error }),
    setResult: (result) => set({ result }),
  }));
};
