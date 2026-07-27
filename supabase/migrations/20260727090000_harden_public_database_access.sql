-- FishCast public/private database boundary.
--
-- Anonymous clients may read only public fishing-reference data. Internal
-- caches, provider-derived snapshots, and retained historical account data are
-- server-only or owner-only. The service role continues to bypass RLS for
-- trusted cache reads and writes.

begin;

-- Keep RLS explicitly enabled on every application table.
alter table public.profiles              enable row level security;
alter table public.regions               enable row level security;
alter table public.spots                 enable row level security;
alter table public.spot_photos           enable row level security;
alter table public.species               enable row level security;
alter table public.spot_species          enable row level security;
alter table public.favorites             enable row level security;
alter table public.condition_snapshots   enable row level security;
alter table public.community_reports     enable row level security;
alter table public.score_cache           enable row level security;
alter table public.marine_cache          enable row level security;
alter table public.marine_timeline_cache enable row level security;
alter table public.ai_recommendations    enable row level security;

-- Public reference data ------------------------------------------------------
-- Reset anonymous table grants so these tables are read-only to anonymous
-- callers even if broader default grants exist in the project.
revoke all privileges on table
  public.regions,
  public.spots,
  public.spot_photos,
  public.species,
  public.spot_species
from anon;

grant select on table
  public.regions,
  public.spots,
  public.spot_photos,
  public.species,
  public.spot_species
to anon, authenticated;

drop policy if exists "regions public read" on public.regions;
create policy "regions public read"
  on public.regions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "spots public read" on public.spots;
create policy "spots public read"
  on public.spots
  for select
  to anon, authenticated
  using (active is true);

drop policy if exists "spot_photos public read" on public.spot_photos;
create policy "spot_photos public read"
  on public.spot_photos
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.spots
      where spots.id = spot_photos.spot_id
        and spots.active is true
    )
  );

drop policy if exists "species public read" on public.species;
create policy "species public read"
  on public.species
  for select
  to anon, authenticated
  using (true);

drop policy if exists "spot_species public read" on public.spot_species;
create policy "spot_species public read"
  on public.spot_species
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.spots
      where spots.id = spot_species.spot_id
        and spots.active is true
    )
  );

-- Private and internal data --------------------------------------------------
-- Remove anonymous table privileges as defense in depth. Authenticated grants
-- are left intact for retained historical account data, and service-role
-- access remains available for trusted server cache operations.
revoke all privileges on table
  public.profiles,
  public.favorites,
  public.community_reports,
  public.condition_snapshots,
  public.marine_cache,
  public.score_cache,
  public.marine_timeline_cache,
  public.ai_recommendations
from anon;

-- Remove every repository-defined broad public SELECT policy from private
-- account, report, snapshot, and cache tables.
drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "reports public read" on public.community_reports;
drop policy if exists "snapshots public read" on public.condition_snapshots;
drop policy if exists "marine_cache public read" on public.marine_cache;
drop policy if exists "score_cache public read" on public.score_cache;
drop policy if exists "marine_timeline_cache public read"
  on public.marine_timeline_cache;
drop policy if exists "ai_recommendations public read"
  on public.ai_recommendations;

-- Historical account records remain accessible only to their authenticated
-- owners. Recreate the existing owner policies with an explicit role target,
-- and add owner SELECT policies where the removed public policy previously
-- supplied read access.
grant select, update on table public.profiles to authenticated;
grant select, insert, delete on table public.favorites to authenticated;
grant select, insert, update, delete on table public.community_reports
  to authenticated;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "favorites select own" on public.favorites;
create policy "favorites select own"
  on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "favorites insert own" on public.favorites;
create policy "favorites insert own"
  on public.favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "favorites delete own" on public.favorites;
create policy "favorites delete own"
  on public.favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "reports select own" on public.community_reports;
create policy "reports select own"
  on public.community_reports
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "reports insert own" on public.community_reports;
create policy "reports insert own"
  on public.community_reports
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "reports update own" on public.community_reports;
create policy "reports update own"
  on public.community_reports
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "reports delete own" on public.community_reports;
create policy "reports delete own"
  on public.community_reports
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
