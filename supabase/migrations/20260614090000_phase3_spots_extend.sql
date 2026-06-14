-- Phase 3: extend `spots` with presentation/identity fields used by the map,
-- spot cards, and details page. All additive and non-breaking.

alter table public.spots
  add column if not exists slug text,
  add column if not exists image_url text,
  add column if not exists region text,
  add column if not exists province text,
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

-- slug is the public identifier used in URLs (/spots/<slug>).
update public.spots set slug = coalesce(slug, id::text) where slug is null;
alter table public.spots alter column slug set not null;

create unique index if not exists spots_slug_key on public.spots (slug);
create index if not exists spots_active_idx on public.spots (active);

-- keep updated_at fresh on every change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists spots_set_updated_at on public.spots;
create trigger spots_set_updated_at
  before update on public.spots
  for each row execute function public.set_updated_at();
