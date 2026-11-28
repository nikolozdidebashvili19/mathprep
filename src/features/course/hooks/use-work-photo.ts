'use client';
import { useEffect, useState } from 'react';

import { usePracticeStore } from '@/features/course/hooks/usePracticeStore';
import { PracticePhotoFeedback } from '@/features/course/types/course.types';
import { WORK_PHOTO_COPY } from '@/shared/const/course.const';
import { http } from '@/shared/lib/http';
import { compressImage } from '@/shared/utils/image-compress';

const LIMIT_MESSAGES: Record<string, string> = {
  PHOTO_DAILY_LIMIT: WORK_PHOTO_COPY.dailyLimit,
  QUESTION_PHOTO_LIMIT: WORK_PHOTO_COPY.questionLimit,
};

/**
 * Photo of the handwritten working for one practice question: compress in the browser, send, and put the analysis
 * on the item ("I'm stuck" stage 3 before answering, "find my mistake" after a wrong answer).
 */
export const useWorkPhoto = (sessionId: string, itemIndex: number) => {
  const { setWorkPhoto } = usePracticeStore();
  const [status, setStatus] = useState<'idle' | 'compressing' | 'analysing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const send = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setStatus('compressing');
    try {
      const blob = await compressImage(file);
      setPreviewUrl(URL.createObjectURL(blob));
      setStatus('analysing');
      const form = new FormData();
      form.append('sessionId', sessionId);
      form.append('itemIndex', String(itemIndex));
      form.append('photo', blob, `work-${itemIndex}.jpg`);
      setWorkPhoto(itemIndex, await http.post<PracticePhotoFeedback>('/course/practice/photo', form));
    } catch (e) {
      setError(LIMIT_MESSAGES[(e as Error).message] ?? WORK_PHOTO_COPY.failed);
    } finally {
      setStatus('idle');
    }
  };

  return { status, error, previewUrl, send };
};
