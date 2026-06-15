'use client';

import { useMemo, useState } from 'react';
import { PageTransition } from '@/components/shared/motion';
import { PremiumCard } from '@/components/spot/premium-card';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
} from '@/lib/supabase/actions';

export interface LoginClientProps {
  redirectTo: string;
  error?: string;
  message?: string;
}


export function LoginClient({ redirectTo, error, message }: LoginClientProps) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const formAction = mode === 'signIn' ? signInWithPassword : signUpWithPassword;
  const submitLabel = mode === 'signIn' ? 'Sign in' : 'Sign up';
  const toggleLabel =
    mode === 'signIn'
      ? "Don't have an account? Sign up"
      : 'Already have an account? Sign in';

  const messageComponent = useMemo(() => {
    if (error) {
      return (
        <p className="mt-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      );
    }

    if (message) {
      return (
        <p className="mt-4 rounded-md bg-primary/15 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      );
    }

    return null;
  }, [error, message]);

  return (
    <PageTransition className="flex min-h-dvh items-center justify-center p-5">
      <PremiumCard className="w-full max-w-sm p-8">
        <div className="text-center">
          <h1 className="font-display text-h1">{siteConfig.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'signIn'
              ? 'Sign in to save spots and share reports.'
              : 'Create your account to save spots and submit reports.'}
          </p>
        </div>

        {messageComponent}

        <form action={formAction} className="mt-6 space-y-3">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <Button type="submit" className="w-full">
            {submitLabel}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {toggleLabel}
          </button>
        </div>

        <form action={signInWithGoogle} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>
      </PremiumCard>
    </PageTransition>
  );
}