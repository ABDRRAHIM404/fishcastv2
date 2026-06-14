-- Phase 3 seed: local fishing spots only — Chtouka Aït Baha / Souss-Massa, Morocco.
-- No international or demo locations. Idempotent on slug.

-- Region row -----------------------------------------------------------------
insert into public.regions (id, name, country, bounds)
values (
  '11111111-1111-1111-1111-111111111111',
  'Souss-Massa',
  'Morocco',
  '{"sw": [-9.95, 29.55], "ne": [-9.45, 30.45]}'::jsonb
)
on conflict (id) do nothing;

-- Spots ----------------------------------------------------------------------
-- coordinates are approximate for the Souss-Massa coastline.
insert into public.spots
  (region_id, slug, name, description, lat, lng, type, difficulty_level,
   difficulty_factors, image_url, region, province, active)
values
  ('11111111-1111-1111-1111-111111111111', 'sidi-rbat', 'Sidi R''bat',
   'Wide sandy beach at the edge of Souss-Massa National Park, near the Massa river mouth. Gentle access and a good entry point for shore fishing.',
   30.0561, -9.6531, 'beach', 'beginner',
   '{"access": "easy", "terrain": "sand", "hazards": "low"}'::jsonb,
   'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=70',
   'Souss-Massa', 'Chtouka Aït Baha', true),

  ('11111111-1111-1111-1111-111111111111', 'tifnit', 'Tifnit',
   'Traditional fishing village with rocky outcrops and surf. Rewarding for experienced anglers but the rocks and swell demand care.',
   30.1394, -9.6892, 'rocks', 'advanced',
   '{"access": "moderate", "terrain": "rock", "hazards": "swell"}'::jsonb,
   'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=1200&q=70',
   'Souss-Massa', 'Chtouka Aït Baha', true),

  ('11111111-1111-1111-1111-111111111111', 'douira', 'Douira',
   'Quiet stretch of coast inside the national park with mixed sand and rock. Calm conditions suit intermediate shore fishing.',
   30.0922, -9.6700, 'beach', 'intermediate',
   '{"access": "moderate", "terrain": "mixed", "hazards": "low"}'::jsonb,
   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=70',
   'Souss-Massa', 'Chtouka Aït Baha', true),

  ('11111111-1111-1111-1111-111111111111', 'massa', 'Massa',
   'River mouth where the Oued Massa meets the Atlantic. Brackish water and shifting sandbars make for varied, productive fishing.',
   30.0414, -9.6494, 'river_mouth', 'intermediate',
   '{"access": "moderate", "terrain": "estuary", "hazards": "currents"}'::jsonb,
   'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=1200&q=70',
   'Souss-Massa', 'Chtouka Aït Baha', true),

  ('11111111-1111-1111-1111-111111111111', 'sidi-boulfdail', 'Sidi Boulfdail',
   'Remote southern beach with long open sand and consistent surf. Exposed conditions raise the effective difficulty.',
   29.7536, -9.8200, 'beach', 'advanced',
   '{"access": "hard", "terrain": "sand", "hazards": "exposure"}'::jsonb,
   'https://images.unsplash.com/photo-1471922694854-ff1b63b20054?w=1200&q=70',
   'Souss-Massa', 'Chtouka Aït Baha', true),

  ('11111111-1111-1111-1111-111111111111', 'aglou', 'Aglou',
   'Popular beach near Tiznit with sandy shoreline and nearby rock formations. Accessible and friendly for newer anglers.',
   29.7964, -9.8056, 'beach', 'beginner',
   '{"access": "easy", "terrain": "sand", "hazards": "low"}'::jsonb,
   'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=70',
   'Souss-Massa', 'Tiznit', true)
on conflict (slug) do nothing;
