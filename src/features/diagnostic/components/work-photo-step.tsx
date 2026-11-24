'use client';
import { Camera, Loader2, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useId } from 'react';

import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { QUICK_CHECK_COPY } from '@/shared/const/diagnostic.const';
import { cn } from '@/shared/lib/utils';

type WorkPhotoStepProps = {
  optionKey: string;
  optionText: string;
  photoUrl: string | null;
  compressing: boolean;
  disabled: boolean;
  onChoose: (file: File | undefined) => void;
  onChangeAnswer: () => void;
};

/**
 * Photo of the handwritten working for the chosen answer. On phones `capture` opens the rear camera directly;
 * on desktop it is a normal file picker. The preview replaces the big camera tile once a photo is chosen.
 */
export const WorkPhotoStep = ({ optionKey, optionText, photoUrl, compressing, disabled, onChoose, onChangeAnswer }: WorkPhotoStepProps) => {
  const inputId = useId();

  return (
    <div className="animate-rise flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-sky bg-sky/10 px-4 py-3">
        <p className="flex items-center gap-3 font-bold text-sky">
          <span className="text-sm">{QUICK_CHECK_COPY.yourAnswer}:</span>
          <span className="inline-flex size-8 items-center justify-center rounded-lg border-2 border-sky text-sm font-extrabold">
            {optionKey}
          </span>
          <MathText text={optionText} />
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onChangeAnswer} disabled={disabled}>
          {QUICK_CHECK_COPY.changeAnswer}
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xl">{QUICK_CHECK_COPY.photoTitle}</h2>
        <p className="font-semibold text-muted-foreground">{QUICK_CHECK_COPY.photoHint}</p>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onChoose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {photoUrl ? (
        <div className="animate-pop flex flex-col items-center gap-3">
          <Image
            src={photoUrl}
            alt={QUICK_CHECK_COPY.photoAlt}
            width={1200}
            height={1600}
            unoptimized
            className="h-auto max-h-96 w-full rounded-2xl border-2 bg-white object-contain"
          />
          <Button asChild variant="outline" size="sm" aria-disabled={disabled}>
            <label htmlFor={inputId} className="cursor-pointer">
              <RotateCcw className="size-4" />
              {QUICK_CHECK_COPY.retakePhoto}
            </label>
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl',
            'border-2 border-dashed border-sky bg-sky/5 p-6 text-sky transition-colors hover:bg-sky/10'
          )}
        >
          {compressing ? <Loader2 className="size-10 animate-spin" /> : <Camera className="size-10" />}
          <span className="text-lg font-extrabold">{QUICK_CHECK_COPY.takePhoto}</span>
        </label>
      )}
    </div>
  );
};
