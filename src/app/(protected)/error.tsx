'use client';
import { useEffect } from 'react';

import { Button } from '@/shared/components/ui/button';
import { STATUS_COPY } from '@/shared/const/ui.const';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-4">
      <h2 className="text-2xl font-bold">{STATUS_COPY.errorTitle}</h2>
      <p className="text-muted-foreground">{STATUS_COPY.errorFallback}</p>
      <Button onClick={reset}>{STATUS_COPY.retry}</Button>
    </div>
  );
}
