'use client';
import { usePracticeStore } from '@/features/course/hooks/usePracticeStore';
import { PracticeAnswerResult, StuckStep } from '@/features/course/types/course.types';
import { HINT_COPY, PRACTICE_COPY } from '@/shared/const/course.const';
import { http } from '@/shared/lib/http';
import { sound } from '@/shared/lib/sound';

/** Daily-session actions: check an answer (instant feedback), mark a theory card read, continue, go back. */
export const usePractice = () => {
  const { view, index, selected, feedback, markAnswered, next, back, setHints, setBusy, setError, setSummary, insertItem } = usePracticeStore();

  const send = async (answer: string) => {
    if (!view?.id) return null;
    setBusy(true);
    setError(null);
    try {
      const result = await http.post<PracticeAnswerResult>('/course/practice/answer', { sessionId: view.id, itemIndex: index, answer });
      if (result.summary) setSummary(result.summary);
      return result;
    } catch {
      setError(PRACTICE_COPY.saveError);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    if (!selected || feedback) return;
    const result = await send(selected);
    if (!result) return;
    sound.play(result.correct ? 'correct' : 'wrong');
    markAnswered(index, selected, { correct: result.correct, correctAnswer: result.correctAnswer, solution: result.solution, reteach: result.reteach });
    // A wrong answer brings an easier question on the same skill right after this one.
    if (result.secondChance) insertItem(index + 1, result.secondChance);
  };

  const gotIt = async () => {
    const result = await send('');
    if (result) {
      markAnswered(index, '', { correct: true, correctAnswer: null, solution: null, reteach: null });
      next();
    }
  };

  /** "I'm stuck": reveals the next rung (the server decides what it is; real hints lower how much the answer counts). */
  const requestHint = async () => {
    if (!view?.id) return;
    setBusy(true);
    setError(null);
    try {
      const result = await http.post<{ hints: StuckStep[]; hintsTotal: number }>('/course/practice/hint', { sessionId: view.id, itemIndex: index });
      setHints(index, result.hints);
    } catch {
      setError(HINT_COPY.error);
    } finally {
      setBusy(false);
    }
  };

  return { check, gotIt, next, back, requestHint };
};
