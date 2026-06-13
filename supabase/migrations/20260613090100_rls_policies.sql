-- Phase 2: Row Level Security.
-- Read-only public data is readable by everyone; user-owned data is writable
-- only by its owner; snapshot/cache writes are restricted to the service role.

alter table public.profiles            enable row level security;
alter table public.regions             enable row level security;
alter table public.spots               enable row level security;
alter table public.spot_photos         enable row level security;
alter table public.species             enable row level security;
alter table public.spot_species        enable row level security;
alter table public.favorites           enable row level security;
alter table public.condition_snapshots enable row level security;
alter table public.community_reports   enable row level security;
alter table public.score_cache         enable row level security;

-- Public read reference data --------------------------------------------------
drop policy if exists "regions public read" on public.regions;
create policy "regions public read" on public.regions for select using (true);

drop policy if exists "spots public read" on public.spots;
create policy "spots public read" on public.spots for select using (true);

drop policy if exists "spot_photos public read" on public.spot_photos;
create policy "spot_photos public read" on public.spot_photos for select using (true);

drop policy if exists "species public read" on public.species;
create policy "species public read" on public.species for select using (true);

drop policy if exists "spot_species public read" on public.spot_species;
create policy "spot_species public read" on public.spot_species for select using (true);

-- profiles --------------------------------------------------------------------
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- favorites (owner only) ------------------------------------------------------
drop policy if exists "favorites select own" on public.favorites;
create policy "favorites select own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites insert own" on public.favorites;
create policy "favorites insert own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites delete own" on public.favorites;
create policy "favorites delete own" on public.favorites
  for delete using (auth.uid() = user_id);

-- community_reports -----------------------------------------------------------
drop policy if exists "reports public read" on public.community_reports;
create policy "reports public read" on public.community_reports
  for select using (true);

drop policy if exists "reports insert own" on public.community_reports;
create policy "reports insert own" on public.community_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "reports update own" on public.community_reports;
create policy "reports update own" on public.community_reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reports delete own" on public.community_reports;
create policy "reports delete own" on public.community_reports
  for delete using (auth.uid() = user_id);

-- condition_snapshots: public read, writes via service role only --------------
drop policy if exists "snapshots public read" on public.condition_snapshots;
create policy "snapshots public read" on public.condition_snapshots
  for select using (true);

-- score_cache: public read, writes via service role only ----------------------
drop policy if exists "score_cache public read" on public.score_cache;
create policy "score_cache public read" on public.score_cache
  for select using (true);

-- Note: no insert/update/delete policies for condition_snapshots or
-- score_cache. The service role bypasses RLS, so only trusted server code
-- (using SUPABASE_SERVICE_ROLE_KEY) can write to them.
