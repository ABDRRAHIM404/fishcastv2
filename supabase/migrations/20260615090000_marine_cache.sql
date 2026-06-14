-- Phase 5: marine data cache.
-- Dedicated table for caching normalized marine provider data. Intentionally
-- separate from condition_snapshots (reserved for future historical /
-- score-history records). One most-recent row per (spot_id, kind) via upsert.

create table if not exists public.marine_cache (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  kind text not null check (kind in ('weather','wind','waves','tide')),
  provider text not null,
  normalized jsonb not null,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (spot_id, kind)
);

create index if not exists marine_cache_spot_kind_idx
  on public.marine_cache (spot_id, kind);
create index if not exists marine_cache_expires_at_idx
  on public.marine_cache (expires_at);

-- RLS: marine data is public-readable (consistent with spots). Writes happen
-- server-side via the service role, which bypasses RLS, so no write policy is
-- defined (mirrors condition_snapshots / score_cache).
alter table public.marine_cache enable row level security;

drop policy if exists "marine_cache public read" on public.marine_cache;
create policy "marine_cache public read" on public.marine_cache
  for select using (true);
