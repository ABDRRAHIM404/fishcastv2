import { PageTransition } from '@/components/shared/motion';
import { PremiumCard } from '@/components/spot/premium-card';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
} from '@/lib/supabase/actions';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string; message?: string }>;
}) {
  const { redirectTo = '/', error, message } = await searchParams;

  return (
    <PageTransition className="flex min-h-dvh items-center justify-center p-5">
      <PremiumCard className="w-full max-w-sm p-8">
        <div className="text-center">
          <h1 className="font-display text-h1">{siteConfig.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to save spots and share reports.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-md bg-primary/15 px-3 py-2 text-sm text-primary">
            {message}
          </p>
        ) : null}

        <form className="mt-6 space-y-3">
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
            autoComplete="current-password"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <Button formAction={signInWithPassword} className="flex-1">
              Sign in
            </Button>
            <Button
              formAction={signUpWithPassword}
              variant="outline"
              className="flex-1"
            >
              Sign up
            </Button>
          </div>
        </form>

        <form action={signInWithGoogle} className="mt-3">
          <Button type="submit" variant="outline" className="w-full">
            Continue with Google
          </Button>
        </form>
      </PremiumCard>
    </PageTransition>
  );
}
