-- Phase 9: AI recommendation cache.
-- Caches the structured Gemini recommendation per spot per local date, keyed
-- additionally by prompt_version and a hash of the deterministic input payload
-- so a recommendation is reused only while the underlying conditions/score/
-- windows/species are unchanged. Follows the marine_cache / marine_timeline_
-- cache pattern: public read, service-role writes, TTL via expires_at.
-- Deliberately a separate cache domain (not condition_snapshots / marine_cache
-- / score_cache), consistent with the project's clean separation of concerns.

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  date text not null, -- local day, YYYY-MM-DD
  prompt_version text not null,
  payload_hash text not null, -- hash of the deterministic input contract
  recommendation jsonb not null, -- validated { verdict, summary, bestWindow, confidence }
  source text not null check (source in ('gemini','fallback')),
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (spot_id, date, prompt_version)
);

create index if not exists ai_recommendations_spot_date_idx
  on public.ai_recommendations (spot_id, date);
create index if not exists ai_recommendations_expires_at_idx
  on public.ai_recommendations (expires_at);

-- RLS: public read (consistent with spots / marine_cache / timeline cache).
-- Writes happen server-side via the service role, which bypasses RLS, so no
-- write policy is defined.
alter table public.ai_recommendations enable row level security;

drop policy if exists "ai_recommendations public read"
  on public.ai_recommendations;
create policy "ai_recommendations public read"
  on public.ai_recommendations
  for select using (true);
