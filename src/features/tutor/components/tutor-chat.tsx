'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useTutor } from '@/features/tutor/hooks/use-tutor';
import { TutorMessageFormSchema, TutorMessageFormType } from '@/features/tutor/validations/tutor.validation';
import { Button } from '@/shared/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { MathText } from '@/shared/components/ui/math-text';
import { TUTOR_COPY } from '@/shared/const/tutor.const';
import { cn } from '@/shared/lib/utils';

type TutorChatProps = {
  sessionId: string;
  itemIndex: number;
  /** stuck = before answering: the helper guides but never gives the answer. */
  mode?: 'explain' | 'stuck';
};

/** "Ask the helper" for an answered practice question: closed by default, a short chat when opened. */
export const TutorChat = ({ sessionId, itemIndex, mode = 'explain' }: TutorChatProps) => {
  const [open, setOpen] = useState(false);
  const { turns, remaining, knownRemaining, pending, error, ask } = useTutor(sessionId, itemIndex, mode);
  const form = useForm<TutorMessageFormType>({ resolver: zodResolver(TutorMessageFormSchema), defaultValues: { message: '' } });

  const onSubmit = async ({ message }: TutorMessageFormType) => {
    form.reset({ message: '' });
    await ask(message);
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" className="self-start" onClick={() => setOpen(true)}>
        <Bot className="size-4" />
        {TUTOR_COPY.open}
      </Button>
    );
  }

  return (
    <section className="animate-rise flex flex-col gap-3 rounded-2xl border-2 border-sky bg-card p-4">
      <h3 className="flex items-center gap-2 text-base text-sky">
        <Bot className="size-5" />
        {TUTOR_COPY.title}
      </h3>
      {turns.length === 0 && (
        <p className="text-sm font-semibold text-muted-foreground">{mode === 'stuck' ? TUTOR_COPY.stuckIntro : TUTOR_COPY.intro}</p>
      )}

      <ul className="flex flex-col gap-2" aria-live="polite">
        {turns.map((turn, i) => (
          <li
            key={`${turn.role}-${i}`}
            className={cn(
              'max-w-11/12 rounded-2xl px-3 py-2 text-sm font-semibold',
              turn.role === 'student' ? 'self-end bg-sky text-sky-foreground' : 'self-start bg-muted'
            )}
          >
            <MathText text={turn.text} />
          </li>
        ))}
        {pending && <li className="self-start text-sm font-bold text-muted-foreground">{TUTOR_COPY.thinking}</li>}
      </ul>

      {error && <p className="text-sm font-bold text-destructive">{error}</p>}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    {...field}
                    placeholder={mode === 'stuck' ? TUTOR_COPY.stuckPlaceholder : TUTOR_COPY.placeholder}
                    disabled={pending || remaining === 0}
                    autoComplete="off"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="submit" size="icon" aria-label={TUTOR_COPY.send} disabled={pending || remaining === 0}>
            <Send className="size-4" />
          </Button>
        </form>
      </Form>
      {knownRemaining && <p className="text-xs font-semibold text-muted-foreground">{TUTOR_COPY.remaining(remaining)}</p>}
    </section>
  );
};
