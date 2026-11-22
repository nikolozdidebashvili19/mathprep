'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';

import { useLogin } from '@/features/auth/hooks/use-login';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { LoginSchema, LoginType } from '@/features/auth/validations/auth.validation';
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
import { AUTH_FORM_COPY, LOGIN_COPY } from '@/shared/const/auth.const';
import { HOME_ROUTE_AFTER_LOGIN } from '@/shared/const/routes.const';

export const LoginForm = () => {
  const { login } = useLogin();
  const { loading, error } = useAuthStore();

  const form = useForm<LoginType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{LOGIN_COPY.title}</CardTitle>
        <CardDescription>{LOGIN_COPY.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(login)} className="space-y-4">
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
              {loading ? LOGIN_COPY.submitting : LOGIN_COPY.submit}
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
              {LOGIN_COPY.noAccount}{' '}
              <Link href="/sign-up" className="underline underline-offset-4 hover:text-primary">
                {LOGIN_COPY.signUpLink}
              </Link>
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
