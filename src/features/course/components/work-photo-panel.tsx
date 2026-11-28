'use client';
import { Camera, CircleCheck, Loader2, RotateCcw, ScanSearch } from 'lucide-react';
import Image from 'next/image';
import { useId, useState } from 'react';

import { useWorkPhoto } from '@/features/course/hooks/use-work-photo';
import { PracticePhotoFeedback } from '@/features/course/types/course.types';
import { Button } from '@/shared/components/ui/button';
import { MathText } from '@/shared/components/ui/math-text';
import { HINT_COPY, WORK_PHOTO_COPY } from '@/shared/const/course.const';
import { cn } from '@/shared/lib/utils';

type WorkPhotoPanelProps = {
  sessionId: string;
  itemIndex: number;
  /** stuck = "I'm stuck" stage 3 (before answering); mistake = "find my mistake" after a wrong answer. */
  mode: 'stuck' | 'mistake';
  feedback: PracticePhotoFeedback | null;
  /** Stuck mode: whether "more help" still leads to easier questions (stage 4). */
  offerEasier?: boolean;
};

const Line = ({ label, text }: { label: string; text: string }) =>
  text ? (
    <p className="text-sm font-semibold">
      <span className="font-extrabold">{label} </span>
      <MathText text={text} />
    </p>
  ) : null;

/** What the analysis found. An unclear photo or one of another problem asks for a new photo instead of guessing. */
const PhotoFeedbackCard = ({ feedback }: { feedback: PracticePhotoFeedback }) => {
  if (feedback.status !== 'done') {
    const messages = { unreadable: WORK_PHOTO_COPY.unreadable, other_question: WORK_PHOTO_COPY.otherQuestion, failed: WORK_PHOTO_COPY.failed };
    const message = messages[feedback.status];
    return <p className="animate-pop rounded-2xl border-2 border-streak/40 bg-streak/10 p-3 text-sm font-bold">{message}</p>;
  }
  if (feedback.progress === 'on_track') {
    return (
      <div className="animate-pop flex flex-col gap-1.5 rounded-2xl border-2 border-primary/40 bg-primary/10 p-3">
        <p className="flex items-center gap-2 text-sm font-extrabold text-primary">
          <CircleCheck className="size-5" />
          {WORK_PHOTO_COPY.onTrack}
        </p>
        <Line label={WORK_PHOTO_COPY.nextStep} text={feedback.nextStep} />
      </div>
    );
  }
  return (
    <div className="animate-pop flex flex-col gap-1.5 rounded-2xl border-2 border-sky/40 bg-sky/10 p-3">
      <p className="flex items-center gap-2 text-sm font-extrabold text-sky">
        <ScanSearch className="size-5" />
        {HINT_COPY.kinds.photo}
      </p>
      <Line label={WORK_PHOTO_COPY.where} text={feedback.where} />
      <Line label={WORK_PHOTO_COPY.issue} text={feedback.issue} />
      <Line label={feedback.mode === 'stuck' ? WORK_PHOTO_COPY.nextStep : WORK_PHOTO_COPY.fix} text={feedback.nextStep || WORK_PHOTO_COPY.safeNextStep} />
      {feedback.weakSkillName && <p className="text-xs font-extrabold text-muted-foreground">{WORK_PHOTO_COPY.weakSkill(feedback.weakSkillName)}</p>}
    </div>
  );
};

/**
 * Photo of the handwritten working (T-020 "I'm stuck" stage 3 / "find my mistake"). On phones `capture` opens the
 * rear camera; on desktop it is a file picker. The AI reads the actual working, not just the answer.
 */
export const WorkPhotoPanel = ({ sessionId, itemIndex, mode, feedback, offerEasier = false }: WorkPhotoPanelProps) => {
  const inputId = useId();
  const [open, setOpen] = useState(mode === 'stuck' || feedback !== null);
  const { status, error, previewUrl, send } = useWorkPhoto(sessionId, itemIndex);
  const busy = status !== 'idle';
  const canSend = !feedback || feedback.retakesLeft > 0;

  if (!open) {
    return (
      <Button type="button" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        <ScanSearch className="size-4" />
        {WORK_PHOTO_COPY.findMistake}
      </Button>
    );
  }

  return (
    <div className="animate-rise flex flex-col gap-3">
      {mode === 'mistake' && <p className="text-sm font-semibold text-muted-foreground">{WORK_PHOTO_COPY.findMistakeIntro}</p>}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={busy || !canSend}
        onChange={(e) => {
          void send(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {previewUrl && (
        <Image
          src={previewUrl}
          alt={WORK_PHOTO_COPY.photoAlt}
          width={1200}
          height={1600}
          unoptimized
          className="h-auto max-h-64 w-full rounded-2xl border-2 bg-white object-contain"
        />
      )}
      {busy ? (
        <p className="flex items-center gap-2 text-sm font-bold text-sky" aria-live="polite">
          <Loader2 className="size-5 animate-spin" />
          {WORK_PHOTO_COPY.analysing}
        </p>
      ) : (
        canSend && (
          <label
            htmlFor={inputId}
            className={cn(
              'flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sky bg-sky/5 p-4',
              'font-extrabold text-sky transition-colors hover:bg-sky/10',
              feedback ? 'min-h-12' : 'min-h-24'
            )}
          >
            {feedback ? <RotateCcw className="size-5" /> : <Camera className="size-6" />}
            {feedback ? WORK_PHOTO_COPY.retake : WORK_PHOTO_COPY.take}
          </label>
        )
      )}
      {feedback && !busy && <PhotoFeedbackCard feedback={feedback} />}
      {feedback && feedback.retakesLeft > 0 && feedback.status !== 'done' && (
        <p className="text-xs font-semibold text-muted-foreground">{WORK_PHOTO_COPY.retakesLeft(feedback.retakesLeft)}</p>
      )}
      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      {mode === 'stuck' && offerEasier && <p className="text-xs font-semibold text-muted-foreground">{HINT_COPY.noPhotoHint}</p>}
    </div>
  );
};
