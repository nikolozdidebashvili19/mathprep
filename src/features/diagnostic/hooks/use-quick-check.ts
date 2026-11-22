'use client';
import { useQuickCheckStore } from '@/features/diagnostic/hooks/useQuickCheckStore';
import { QuickCheckResult, QuickCheckView } from '@/features/diagnostic/types/diagnostic.types';
import { DIAGNOSTIC_COPY, QUICK_CHECK_COPY } from '@/shared/const/diagnostic.const';
import { http } from '@/shared/lib/http';
import { compressImage } from '@/shared/utils/image-compress';

/**
 * Quick-check actions: pick an answer → photograph the working → send both (the answer is final);
 * "I don't know" skips the photo. After the last question the session is finished and analysed.
 */
export const useQuickCheck = () => {
  const { view, selected, photo, setStep, setPhoto, showQuestion, setBusy, setError, setResult } = useQuickCheckStore();

  const finish = async (sessionId: string) => {
    setBusy('finishing');
    try {
      setResult(await http.post<QuickCheckResult>('/diagnostic/quick/finish', { sessionId }));
    } catch {
      setError(DIAGNOSTIC_COPY.finishError);
    } finally {
      setBusy('idle');
    }
  };

  const submit = async (answer: string, photoBlob: Blob | null) => {
    const question = view?.current;
    if (!view || !question) return;
    setBusy('sending');
    setError(null);
    try {
      if (photoBlob) {
        const form = new FormData();
        form.append('sessionId', view.id);
        form.append('questionId', question.id);
        form.append('photo', photoBlob, `q-${question.id}.jpg`);
        await http.post('/diagnostic/quick/photo', form);
      }
      const next = await http.post<QuickCheckView>('/diagnostic/quick/answer', { sessionId: view.id, questionId: question.id, answer });
      setBusy('idle');
      if (next.current) showQuestion(next);
      else await finish(view.id);
    } catch {
      setBusy('idle');
      setError(photoBlob ? QUICK_CHECK_COPY.photoError : DIAGNOSTIC_COPY.saveError);
    }
  };

  /** Option chosen → ask for the photo of the working. */
  const confirmAnswer = () => {
    if (selected) setStep('photo');
  };

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy('compressing');
    try {
      setPhoto(await compressImage(file));
    } catch {
      setError(QUICK_CHECK_COPY.photoReadError);
    } finally {
      setBusy('idle');
    }
  };

  const sendWithPhoto = () => {
    if (selected && photo) void submit(selected, photo);
  };

  const dontKnow = () => void submit('', null);

  const backToAnswer = () => setStep('answer');

  const retryFinish = () => {
    if (view) void finish(view.id);
  };

  return { confirmAnswer, choosePhoto, sendWithPhoto, dontKnow, backToAnswer, retryFinish };
};
