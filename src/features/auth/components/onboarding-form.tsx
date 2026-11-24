'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useOnboarding } from '@/features/auth/hooks/use-onboarding';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { OnboardingSchema, OnboardingType } from '@/features/auth/validations/auth.validation';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { ONBOARDING_COPY } from '@/shared/const/auth.const';
import { cn } from '@/shared/lib/utils';

export const OnboardingForm = () => {
  const { saveOnboarding } = useOnboarding();
  const { loading, error } = useAuthStore();

  const form = useForm<OnboardingType>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: { grade: undefined, targetScore: undefined },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{ONBOARDING_COPY.title}</CardTitle>
        <CardDescription>{ONBOARDING_COPY.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveOnboarding)} className="space-y-6">
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{ONBOARDING_COPY.gradeLabel}</FormLabel>
                  <div role="radiogroup" aria-label={ONBOARDING_COPY.gradeLabel} className="grid grid-cols-2 gap-2">
                    {ONBOARDING_COPY.gradeOptions.map((option) => {
                      const selected = field.value === option.value;

                      return (
                        <Button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          variant="outline"
                          onClick={() => field.onChange(option.value)}
                          className={cn(
                            'h-20 text-base',
                            selected && 'border-sky bg-sky/10 text-sky shadow-edge-sky hover:bg-sky/15'
                          )}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{ONBOARDING_COPY.targetLabel}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      placeholder={ONBOARDING_COPY.targetPlaceholder}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>{ONBOARDING_COPY.targetHint}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? ONBOARDING_COPY.submitting : ONBOARDING_COPY.submit}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
