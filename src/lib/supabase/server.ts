import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Anonymous server-side Supabase client for public reads. It deliberately has
 * no cookie adapter or persisted session; trusted writes use service.ts.
 */
export async function createClient() {
  noStore();
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
