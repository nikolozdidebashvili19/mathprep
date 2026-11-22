'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { COURSE_COPY } from '@/shared/const/course.const';
import { http } from '@/shared/lib/http';

/** Ends the active course after a confirmation, then shows the setup screen again. */
export const useAbandonCourse = () => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abandon = async () => {
    if (!window.confirm(COURSE_COPY.replanConfirm)) return;
    setPending(true);
    setError(null);
    try {
      await http.post('/course/abandon');
      router.refresh();
    } catch {
      setError(COURSE_COPY.replanError);
    } finally {
      setPending(false);
    }
  };

  return { abandon, pending, error };
};
