import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Exchanges the OAuth / email-confirmation code for a session, then redirects.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = searchParams.get('next') ?? '/';
  const next = requestedNext.startsWith('/') ? requestedNext : '/';
  const callbackBase = origin || process.env.NEXT_PUBLIC_SITE_URL || '';
  const redirectTo = callbackBase ? `${callbackBase}${next}` : next;
  const loginRedirect = callbackBase
    ? `${callbackBase}/login?error=Could%20not%20sign%20in`
    : `/login?error=Could%20not%20sign%20in`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(loginRedirect);
}
