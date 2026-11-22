'use client';
import { useDiagnosticStore } from '@/features/diagnostic/hooks/useDiagnosticStore';
import { DiagnosticResult } from '@/features/diagnostic/types/diagnostic.types';
import { DIAGNOSTIC_COPY } from '@/shared/const/diagnostic.const';
import { http } from '@/shared/lib/http';

/** Saves the current answer, then moves to the next question or, after the last one, grades the session. */
export const useAnswerQuestion = () => {
  const { session, currentIndex, setSaving, setError, recordAnswer, goTo, setResult } = useDiagnosticStore();

  const finish = async (sessionId: string) => {
    try {
      const result = await http.post<DiagnosticResult>('/diagnostic/finish', { sessionId });
      setResult(result);
    } catch {
      setError(DIAGNOSTIC_COPY.finishError);
    }
  };

  const submitAnswer = async (answer: string) => {
    const question = session?.questions[currentIndex];
    if (!session || !question) return;

    setSaving(true);
    setError(null);
    try {
      await http.put('/diagnostic/answer', { sessionId: session.id, questionId: question.id, answer });
      recordAnswer(question.id, answer);
      const isLast = currentIndex === session.questions.length - 1;
      if (isLast) await finish(session.id);
      else goTo(currentIndex + 1);
    } catch {
      setError(DIAGNOSTIC_COPY.saveError);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) goTo(currentIndex - 1);
  };

  return { submitAnswer, goBack };
};
