'use client';
import { useState } from 'react';

import { TutorReply, TutorTurn } from '@/features/tutor/types/tutor.types';
import { TUTOR_COPY, TUTOR_DAILY_LIMIT, TUTOR_MAX_HISTORY } from '@/shared/const/tutor.const';
import { http } from '@/shared/lib/http';

/**
 * AI helper conversation for one answered practice question. The conversation lives only in this panel; only the
 * last TUTOR_MAX_HISTORY turns are sent with each question (token budget).
 */
export const useTutor = (sessionId: string, itemIndex: number, mode: 'explain' | 'stuck' = 'explain') => {
  const [turns, setTurns] = useState<TutorTurn[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async (message: string) => {
    setPending(true);
    setError(null);
    const history = turns.slice(-TUTOR_MAX_HISTORY);
    setTurns((t) => [...t, { role: 'student', text: message }]);
    try {
      const result = await http.post<TutorReply>('/tutor/ask', { sessionId, itemIndex, message, history, mode });
      setTurns((t) => [...t, { role: 'tutor', text: result.reply }]);
      setRemaining(result.remaining);
    } catch (e) {
      const limit = (e as { status?: number }).status === 429;
      setError(limit ? TUTOR_COPY.limitReached : TUTOR_COPY.error);
      if (limit) setRemaining(0);
    } finally {
      setPending(false);
    }
  };

  return { turns, remaining: remaining ?? TUTOR_DAILY_LIMIT, knownRemaining: remaining !== null, pending, error, ask };
};
