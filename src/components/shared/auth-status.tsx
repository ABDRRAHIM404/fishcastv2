import { signOut } from '@/lib/supabase/actions';
import { createClient } from '@/lib/supabase/server';

/**
 * Server component that surfaces auth state in the app shell.
 * Shows the signed-in user's email + a sign-out control, or a sign-in link.
 */
export async function AuthStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <a
        href="/login"
        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign in
      </a>
    );
  }

  return (
    <form action={signOut} className="flex items-center gap-2">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {user.email}
      </span>
      <button
        type="submit"
        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
