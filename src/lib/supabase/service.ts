import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Service-role Supabase client for trusted server-side writes that must bypass
 * RLS (e.g. caching marine data into marine_cache, which has public read but no
 * public write policy). Never import this in client code. Reads the key from
 * SUPABASE_SERVICE_ROLE_KEY; returns null when not configured so callers can
 * skip caching and still serve fresh data.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
