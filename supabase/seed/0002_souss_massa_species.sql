-- Phase 8 seed: realistic Moroccan (Souss-Massa) coastal species + per-spot
-- presence. Idempotent on deterministic UUIDs / composite PKs. No international
-- or demo species. preferred_conditions drives the "favored now" engine.

-- Species catalog ------------------------------------------------------------
insert into public.species
  (id, common_name, local_name, scientific_name, image_url, description,
   preferred_conditions)
values
  ('22222222-0000-0000-0000-000000000001', 'Meagre', 'Maigre (Corvina)',
   'Argyrosomus regius',
   'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=70',
   'A prized predatory fish of the Atlantic surf zone, often hunting near river mouths and sandbanks at first and last light.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["dawn","dusk"]}'::jsonb),

  ('22222222-0000-0000-0000-000000000002', 'European Sea Bass', 'Loup de mer (Qaroos)',
   'Dicentrarchus labrax',
   'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&q=70',
   'A versatile coastal predator that follows the surf and feeds actively on a moving tide along beaches and rocky shores.',
   '{"tide_state":"rising","wind_max_kmh":30,"wave_max_m":2.0,"time_of_day":["dawn","dusk","night"]}'::jsonb),

  ('22222222-0000-0000-0000-000000000003', 'Gilthead Bream', 'Dorade royale (Awrata)',
   'Sparus aurata',
   'https://images.unsplash.com/photo-1559738874-3a8b4c1c5f3c?w=800&q=70',
   'A sought-after bream that frequents sandy and mixed bottoms, feeding on shellfish in calmer coastal water.',
   '{"tide_state":"high","wind_max_kmh":20,"wave_max_m":1.2}'::jsonb),

  ('22222222-0000-0000-0000-000000000004', 'Striped Mullet', 'Mulet (Bouri)',
   'Mugil cephalus',
   'https://images.unsplash.com/photo-1565280654386-466c1cf6f0f9?w=800&q=70',
   'An abundant schooling fish of estuaries and surf, tolerant of brackish water near river mouths.',
   '{"wind_max_kmh":35,"wave_max_m":2.5}'::jsonb),

  ('22222222-0000-0000-0000-000000000005', 'Common Octopus', 'Pieuvre (Karnit)',
   'Octopus vulgaris',
   'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=800&q=70',
   'A staple of Moroccan rocky shores, hiding among rocks and crevices and most catchable in calm, clear conditions.',
   '{"wind_max_kmh":18,"wave_max_m":0.8,"time_of_day":["dawn","dusk","night"]}'::jsonb),

  ('22222222-0000-0000-0000-000000000006', 'Atlantic Mackerel', 'Maquereau (Skambri)',
   'Scomber scombrus',
   'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=800&q=70',
   'A fast pelagic schooling fish that comes within casting range during cooler months, feeding actively in moving water.',
   '{"wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["dawn","morning"]}'::jsonb),

  ('22222222-0000-0000-0000-000000000007', 'Conger Eel', 'Congre (Hancha)',
   'Conger conger',
   'https://images.unsplash.com/photo-1518467166778-b88f373ffec7?w=800&q=70',
   'A powerful nocturnal predator of rocky ground and harbour walls, most active after dark.',
   '{"wave_max_m":2.0,"time_of_day":["night","dusk"]}'::jsonb),

  ('22222222-0000-0000-0000-000000000008', 'Common Sole', 'Sole (Sol)',
   'Solea solea',
   'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=70',
   'A flatfish of sandy bottoms that moves inshore on the tide, feeding low in calm surf.',
   '{"tide_state":"rising","wind_max_kmh":20,"wave_max_m":1.0,"time_of_day":["dusk","night"]}'::jsonb)
on conflict (id) do nothing;

-- Per-spot species presence --------------------------------------------------
-- season_months are 1-12; prevalence is common|occasional|rare.
insert into public.spot_species (spot_id, species_id, season_months, prevalence, notes)
select s.id, x.species_id, x.season_months, x.prevalence::prevalence, x.notes
from (values
  -- Sidi R'bat (beach, river-mouth influence)
  ('sidi-rbat', '22222222-0000-0000-0000-000000000001', '{4,5,6,7,8,9}'::smallint[], 'common', 'Strong meagre runs near the Massa mouth.'),
  ('sidi-rbat', '22222222-0000-0000-0000-000000000002', '{1,2,3,10,11,12}'::smallint[], 'common', 'Sea bass through the cooler months.'),
  ('sidi-rbat', '22222222-0000-0000-0000-000000000004', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Mullet year-round in the surf.'),
  ('sidi-rbat', '22222222-0000-0000-0000-000000000008', '{3,4,5,9,10}'::smallint[], 'occasional', 'Sole on calm evenings.'),

  -- Tifnit (rocks)
  ('tifnit', '22222222-0000-0000-0000-000000000005', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Octopus among the rocks year-round.'),
  ('tifnit', '22222222-0000-0000-0000-000000000007', '{5,6,7,8,9}'::smallint[], 'occasional', 'Conger after dark off the rocks.'),
  ('tifnit', '22222222-0000-0000-0000-000000000002', '{1,2,3,10,11,12}'::smallint[], 'occasional', 'Bass around the rocky edges.'),

  -- Douira (mixed)
  ('douira', '22222222-0000-0000-0000-000000000003', '{4,5,6,7,8,9,10}'::smallint[], 'common', 'Bream over sand and mixed bottom.'),
  ('douira', '22222222-0000-0000-0000-000000000004', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Reliable mullet.'),
  ('douira', '22222222-0000-0000-0000-000000000001', '{5,6,7,8}'::smallint[], 'occasional', 'Summer meagre.'),

  -- Massa (river mouth)
  ('massa', '22222222-0000-0000-0000-000000000001', '{4,5,6,7,8,9}'::smallint[], 'common', 'Estuary meagre on the rising tide.'),
  ('massa', '22222222-0000-0000-0000-000000000004', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Mullet thrive in brackish water.'),
  ('massa', '22222222-0000-0000-0000-000000000002', '{1,2,3,10,11,12}'::smallint[], 'common', 'Bass hunt the sandbars.'),
  ('massa', '22222222-0000-0000-0000-000000000008', '{3,4,5,9,10}'::smallint[], 'occasional', 'Sole on the estuary sand.'),

  -- Sidi Boulfdail (exposed beach)
  ('sidi-boulfdail', '22222222-0000-0000-0000-000000000002', '{1,2,3,10,11,12}'::smallint[], 'common', 'Surf bass on the open beach.'),
  ('sidi-boulfdail', '22222222-0000-0000-0000-000000000006', '{11,12,1,2,3}'::smallint[], 'occasional', 'Winter mackerel shoals.'),
  ('sidi-boulfdail', '22222222-0000-0000-0000-000000000004', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Mullet in the surf.'),

  -- Aglou (beach + rock)
  ('aglou', '22222222-0000-0000-0000-000000000003', '{4,5,6,7,8,9,10}'::smallint[], 'common', 'Bream near the rock formations.'),
  ('aglou', '22222222-0000-0000-0000-000000000005', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'occasional', 'Octopus on the rocky patches.'),
  ('aglou', '22222222-0000-0000-0000-000000000006', '{11,12,1,2,3}'::smallint[], 'occasional', 'Mackerel in cooler months.')
) as x(spot_slug, species_id, season_months, prevalence, notes)
join public.spots s on s.slug = x.spot_slug
on conflict (spot_id, species_id) do nothing;
