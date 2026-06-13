'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/** Email + password sign-in. */
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirectTo') ?? '/');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/', 'layout');
  redirect(redirectTo || '/');
}

/** Email + password sign-up. Profile is auto-created by a DB trigger. */
export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? '';
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/login?message=Check%20your%20email%20to%20confirm%20your%20account');
}

/** Optional Google OAuth. No-op-safe if Google provider is not configured. */
export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get('origin') ?? '';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data?.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'OAuth unavailable')}`);
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/** Add a favorite for the current user. */
export async function addFavorite(spotId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase.from('favorites').insert({ user_id: user.id, spot_id: spotId });
  revalidatePath('/favorites');
}

/** Remove a favorite for the current user. */
export async function removeFavorite(spotId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('spot_id', spotId);
  revalidatePath('/favorites');
}
