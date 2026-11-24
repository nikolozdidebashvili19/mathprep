'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';

import { useRegister } from '@/features/auth/hooks/use-register';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { SignUpSchema, SignUpType } from '@/features/auth/validations/auth.validation';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { AUTH_FORM_COPY, SIGNUP_COPY } from '@/shared/const/auth.const';
import { HOME_ROUTE_AFTER_LOGIN } from '@/shared/const/routes.const';

export const SignUpForm = () => {
  const { register } = useRegister();
  const { loading, error } = useAuthStore();

  const form = useForm<SignUpType>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{SIGNUP_COPY.title}</CardTitle>
        <CardDescription>{SIGNUP_COPY.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(register)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{SIGNUP_COPY.fullName}</FormLabel>
                  <FormControl>
                    <Input placeholder={SIGNUP_COPY.fullNamePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{AUTH_FORM_COPY.email}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={AUTH_FORM_COPY.emailPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{AUTH_FORM_COPY.password}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? SIGNUP_COPY.submitting : SIGNUP_COPY.submit}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs font-bold">
                <span className="bg-card px-2 text-muted-foreground">{AUTH_FORM_COPY.or}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn('google', { callbackUrl: HOME_ROUTE_AFTER_LOGIN })}
            >
              {AUTH_FORM_COPY.google}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {SIGNUP_COPY.haveAccount}{' '}
              <Link href="/sign-in" className="underline underline-offset-4 hover:text-primary">
                {SIGNUP_COPY.signInLink}
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
