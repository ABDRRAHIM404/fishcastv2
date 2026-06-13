-- Phase 2: core schema for FishCast.
-- Location strategy: we store plain numeric lat/lng (always present) and an
-- optional PostGIS geography(Point) column `geom` for spatial queries when the
-- postgis extension is available. lat/lng are the source of truth.

create extension if not exists postgis;
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Enums -----------------------------------------------------------------------
do $$ begin
  create type spot_type as enum ('beach','rocks','port','river_mouth','pier');
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty_level as enum ('beginner','intermediate','advanced','expert');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prevalence as enum ('common','occasional','rare');
exception when duplicate_object then null; end $$;

-- profiles (extends auth.users) ----------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- regions ---------------------------------------------------------------------
create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  bounds jsonb
);

-- spots -----------------------------------------------------------------------
create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.regions (id) on delete set null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  geom geography(Point, 4326),
  type spot_type not null,
  description text,
  difficulty_level difficulty_level not null default 'beginner',
  difficulty_factors jsonb,
  created_at timestamptz not null default now()
);
create index if not exists spots_region_id_idx on public.spots (region_id);
create index if not exists spots_geom_idx on public.spots using gist (geom);

-- keep geom in sync with lat/lng
create or replace function public.spots_sync_geom()
returns trigger language plpgsql as $$
begin
  new.geom := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  return new;
end $$;

drop trigger if exists spots_sync_geom_trg on public.spots;
create trigger spots_sync_geom_trg
  before insert or update of lat, lng on public.spots
  for each row execute function public.spots_sync_geom();

-- spot_photos -----------------------------------------------------------------
create table if not exists public.spot_photos (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  url text not null,
  position integer not null default 0
);
create index if not exists spot_photos_spot_id_idx on public.spot_photos (spot_id);

-- species ---------------------------------------------------------------------
create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  local_name text,
  scientific_name text,
  image_url text,
  description text,
  preferred_conditions jsonb
);

-- spot_species (junction) -----------------------------------------------------
create table if not exists public.spot_species (
  spot_id uuid not null references public.spots (id) on delete cascade,
  species_id uuid not null references public.species (id) on delete cascade,
  season_months smallint[],
  prevalence prevalence,
  notes text,
  primary key (spot_id, species_id)
);
create index if not exists spot_species_species_id_idx on public.spot_species (species_id);

-- favorites -------------------------------------------------------------------
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id uuid not null references public.spots (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);
create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists favorites_spot_id_idx on public.favorites (spot_id);

-- condition_snapshots ---------------------------------------------------------
create table if not exists public.condition_snapshots (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  captured_at timestamptz not null default now(),
  tide_height double precision,
  tide_state text,
  wind_speed double precision,
  wind_dir double precision,
  wave_height double precision,
  weather jsonb,
  source text
);
create index if not exists condition_snapshots_spot_id_idx on public.condition_snapshots (spot_id);
create index if not exists condition_snapshots_captured_at_idx on public.condition_snapshots (captured_at);

-- community_reports -----------------------------------------------------------
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid not null references public.spots (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  species_id uuid references public.species (id) on delete set null,
  catch_count integer,
  notes text,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists community_reports_spot_id_idx on public.community_reports (spot_id);
create index if not exists community_reports_user_id_idx on public.community_reports (user_id);

-- score_cache -----------------------------------------------------------------
create table if not exists public.score_cache (
  spot_id uuid not null references public.spots (id) on delete cascade,
  computed_at timestamptz not null default now(),
  score double precision not null,
  factors jsonb,
  primary key (spot_id, computed_at)
);

-- auto-create profile on signup ----------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
