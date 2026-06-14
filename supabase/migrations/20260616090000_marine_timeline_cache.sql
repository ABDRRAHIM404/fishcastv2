-- Phase 7: marine timeline cache.
-- Caches the interpolated 5-minute timeline + best windows per spot per date.
-- Follows the marine_cache pattern: public read, service-role writes, TTL via
-- expires_at. Separate from marine_cache because timelines are keyed by date.

create table if not exists public.marine_timeline_cache (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  date text not null, -- local day, YYYY-MM-DD
  payload jsonb not null, -- { points: [...], windows: [...] }
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (spot_id, date)
);

create index if not exists marine_timeline_cache_spot_date_idx
  on public.marine_timeline_cache (spot_id, date);
create index if not exists marine_timeline_cache_expires_at_idx
  on public.marine_timeline_cache (expires_at);

-- RLS: public read (consistent with spots / marine_cache). Writes happen
-- server-side via the service role, which bypasses RLS, so no write policy.
alter table public.marine_timeline_cache enable row level security;

drop policy if exists "marine_timeline_cache public read"
  on public.marine_timeline_cache;
create policy "marine_timeline_cache public read"
  on public.marine_timeline_cache
  for select using (true);
