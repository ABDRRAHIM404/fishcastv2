-- Phase 8 seed: Moroccan (Souss-Massa) coastal species — full local catalog.
-- Replaces previous 8-species set with the 40 species from the local fishing
-- community list. Names preserved exactly as supplied.
-- Idempotent on deterministic UUIDs. preferred_conditions drives "favored now".

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Remove old species (and their spot_species rows via CASCADE or explicit
--    delete — adjust if your FK has no CASCADE).
-- ─────────────────────────────────────────────────────────────────────────────
delete from public.spot_species
where species_id in (
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000006',
  '22222222-0000-0000-0000-000000000007',
  '22222222-0000-0000-0000-000000000008'
);

delete from public.species
where id in (
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000006',
  '22222222-0000-0000-0000-000000000007',
  '22222222-0000-0000-0000-000000000008'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Insert new species catalog (40 species)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.species
  (id, common_name, local_name, scientific_name, image_url, description,
   preferred_conditions)
values

  -- 01 · القرب / corbina / korb
  ('33333333-0000-0000-0000-000000000001',
   'Corbina',
   'القرب - كوربينة ـ corbina ـ korb',
   'Argyrosomus regius',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEi8N6McvCuqDilthj7xfPZkONIHI66wsdLKsf5WqLB1C0mCwTYhPkVhaoedVoGvlLRxUf0Fo0tVjZA6rRZdKo9iXsZqrqqt9NmZE5I1RfUDChIthmSTVW3a5ruk2tJO9ghHHzicJGJ7FtrL/s320/20190616_033310.png',
   'A prized large predator of Moroccan surf beaches and river mouths, locally called القرب or corbina. Hunts in the white water at dawn and dusk, often following mullet schools. One of the most sought-after target species along the Souss-Massa coast.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["dawn","dusk"]}'::jsonb),

  -- 02 · الراسكاس / rascasse
  ('33333333-0000-0000-0000-000000000002',
   'Scorpionfish',
   'الراسكاس - rascasse',
   'Scorpaena scrofa',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgE6WmATRwmEeLfpZ_uUHIyY6d1FvyOI4pyZHZ-uT8w9QusfJ-hRjIWot1j7kIKfPm2M_3HhQZf9ALbb8SS4kt2vEyaZ3UWHh9pp01dTJX6RjTKwdBtaN_KPCOQelpWOo9E95SFnl-TS5G4/s320/20190616_033217.png',
   'A heavily built ambush predator of rocky and reef ground, recognised by its spiny venomous dorsal fins. Lies motionless among rocks waiting for prey. Highly prized for eating despite requiring careful handling. Found year-round on the rocky sections of the Souss-Massa coast.',
   '{"wind_max_kmh":20,"wave_max_m":1.0,"time_of_day":["dawn","dusk","night"]}'::jsonb),

  -- 03 · فوشامة / fouchama
  ('33333333-0000-0000-0000-000000000003',
   'Forkbeard',
   'فوشامة - fouchama',
   'Phycis phycis',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiuxXOBqGL6K4dltUH6AMYdfYrqhekT9eJ3hg4_4Ks38L8zCr-boUxhxe0XnUQVFoAIZmORgDgj9wSIUQrPAwyq8t1XHKRb0X8Ya219qPHLmbOtlKUyTGWchuqUCn-xyvP7Wmb55vsvW3By/s320/20190616_033148.png',
   'A bottom-dwelling fish of rocky and mixed substrate, known locally as فوشامة. Identified by its distinctive forked ventral filaments. Favours moderate depths and is most active at night, feeding on small fish and crustaceans along the Moroccan Atlantic shelf.',
   '{"wind_max_kmh":20,"wave_max_m":1.2,"time_of_day":["night","dusk"]}'::jsonb),

  -- 04 · كبايلة / الاسقمري / makril-kabaila
  ('33333333-0000-0000-0000-000000000004',
   'Chub Mackerel',
   'كبايلة_الاسقمري - makril-kabaila',
   'Scomber colias',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhCFKkA6IUREwD6daUDc2fX3wHpDaBA6BE-yFUrdif5p_4-QEBhh1HHbii8r5pg8Vb3H8zCb4W0hM5XeyoHy7rQMiW89l-eXdOtLQSB-0QZcYEg8TE_9gAl1z-SKN4sBrjDFWi7Spvos0Ph/s320/20190616_034431.png',
   'The Atlantic chub mackerel, known locally as الاسقمري or كبايلة, forms dense fast-moving schools that sweep close to shore during cooler months. A popular and abundant target species fished with sabiki rigs and feathers from beaches and rocks.',
   '{"wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["dawn","morning"]}'::jsonb),

  -- 05 · ابلاغ / نبيرة / لولو / nbira-lolo-ablar
  ('33333333-0000-0000-0000-000000000005',
   'Striped Sea Bream',
   'ابلاغ_نبيرة_لولو-nbira-lolo-ablar',
   'Lithognathus mormyrus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEisCOrjgvPR_3gbpcGNXEsHvrmFY8hcIJ_EDmcSXfSgMAN7ksBZrjY0kOet3PBe4i0iOWxY9PwDRmJZXLMt-ILEiwaEOrYNwRA4qMnzSY2mwyYbC-4U7tLctPiEdO-p98Z4wBqQtfaHVGP8/s320/20190616_033355.png',
   'A slender silver bream with distinctive dark vertical stripes, called ابلاغ or نبيرة locally. Common on sandy and mixed beaches where it roots through sand for worms and crustaceans. A reliable target species in the Souss-Massa surf, especially on a rising tide.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.2}'::jsonb),

  -- 06 · الدرعي / بوشوك / القاروس / الدئب / bochouk-dar3i-9arous
  ('33333333-0000-0000-0000-000000000006',
   'European Sea Bass',
   'الدرعي-بوشوك-القاروس-الدئب-  bochouk-dar3i-9arous',
   'Dicentrarchus labrax',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEizjojDcvdHJWT0YmQNq9nqf5Yv3VQ3YxQ0jBkb1fsY9s94lbsPiVv0jKWA-9CDm06J-m0ifg5P3m_YAP6IecNVTyXTpX0jhu4nBAjn418NwaiebqOQo1VA4g6-uTCdb_a60dzxVpHYQHM3/s320/20190616_034028.png',
   'The European sea bass — known by many local names including القاروس, الدئب, and بوشوك — is the ultimate surf predator of the Moroccan Atlantic. It hunts along sandy beaches, rocky edges, and estuary mouths, most active in broken water on a rising tide at dawn and dusk.',
   '{"tide_state":"rising","wind_max_kmh":30,"wave_max_m":2.0,"time_of_day":["dawn","dusk","night"]}'::jsonb),

  -- 07 · الباغباغ / barbar
  ('33333333-0000-0000-0000-000000000007',
   'Barracuda',
   'الباغباغ - barbar',
   'Sphyraena sphyraena',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgEDeqMvJJqNw8QfmNQC74_dq2uNv1SVIj0dLDa3-YD1CxnVT7ekQ8GTBALD0BX7R2THQPh3yE6pby6jOaOYpcObEjSQGETiJ4fTarN8fNjSmSYjQmw42FsBQHsqMQYCwjyuLdaylXLyv6t/s320/20190616_033604.png',
   'A fast, torpedo-shaped predator locally called الباغباغ or barbar. European barracuda visit Moroccan coastal waters in summer and autumn, often hunting in loose schools near the surface. Caught on lures and live bait from rocks and piers.',
   '{"wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["dawn","morning","dusk"]}'::jsonb),

  -- 08 · الفرخ / الصنور / اصيغاغ / sanour
  ('33333333-0000-0000-0000-000000000008',
   'Comber',
   'الفرخ-الصنور- اصيغاغ - sanour',
   'Serranus cabrilla',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjHEt8kK5nIeG07DAsBg_ts3WDOV0VxT5BC0cfszcVyeuiPdjJvXfPFsnE-0twQ5oVpn4R26k54ARA_9pbmMdNOJ6T57P_G3lY_EnzbIAVPadXsc-cl753ZeihTY4Mwnv98dfnoT646XTHu/s320/20190616_033525.png',
   'A small but feisty rock-dwelling grouper relative, called الصنور or الفرخ locally. Extremely common on rocky ground along the entire Moroccan coast, it bites boldly and is often the first fish beginners catch. Year-round presence on all rocky and mixed spots.',
   '{"wind_max_kmh":30,"wave_max_m":2.0}'::jsonb),

  -- 09 · كلب البحر (dogfish / small shark)
  ('33333333-0000-0000-0000-000000000009',
   'Small-spotted Catshark',
   'كلب البحر',
   'Scyliorhinus canicula',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiLPx72UH5Qt21_hb1fRdKnTooMc9SEPoqx5kvIGcbaEcwGdUREcFmAIP6XR9bYCVaqdcpVRJsyMguUmrj-rVMjI0LWjPVkd9xKd7tD5eWKKlEAZcsPSEdviPLZn0a89iMCHmQI3yyXHtjK/s320/20190616_034111.png',
   'The small-spotted catshark, called كلب البحر (sea dog), is the most common small shark of Moroccan beaches. A bottom feeder found on sand and mixed ground, it is often caught at night on bait. Mostly released by anglers though edible and consumed locally.',
   '{"wind_max_kmh":30,"wave_max_m":2.0,"time_of_day":["night","dusk"]}'::jsonb),

  -- 10 · ميرنا / mirna
  ('33333333-0000-0000-0000-000000000010',
   'Wrasse',
   'سمكة - ميرنا - mirna',
   'Labrus mixtus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgnFbABeBJ6HASUe7lAtyGZiEpjGOpU4pq7bJiI_ZH9gAoWBh9GQWM7A65WExcjyKqWNFmXQ0x5sigqJabEaCFV3xuuSc2jzpys3IF9WrT74rL2ODfmfST7MX51ko5KRRPfJi0GAJXhZQbv/s320/20190616_034140.png',
   'A colourful wrasse of rocky ground and kelp edges, known locally as ميرنا. Males display striking blue and orange patterning. Common on all rocky Souss-Massa spots year-round, feeding on invertebrates among rocks and weed.',
   '{"wind_max_kmh":20,"wave_max_m":1.0}'::jsonb),

  -- 11 · العقرب / scorpion
  ('33333333-0000-0000-0000-000000000011',
   'Small Scorpionfish',
   'scorpion - العقرب',
   'Scorpaena notata',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjSsRRyxPAOO8UxNi9R-Se98uqAhoinp7Td_2w13yFPIG1LCIhx2UA8Ycp6v2OGT9_yjOkXwDt55lj32BLLMGWyFxsZlEnLglA2xYmKvuK7VppXaqUbs3TSbnzl2nA_C6wd8cUrxbTwE_Yh/s320/20190616_034522.png',
   'The small spotted scorpionfish, called العقرب (scorpion), is a reef and rock dweller whose venomous spines demand careful handling. Smaller than the rascasse but equally cryptic, it ambushes small prey in crevices. A frequent bycatch on rocky Moroccan spots.',
   '{"wind_max_kmh":18,"wave_max_m":0.8,"time_of_day":["dawn","dusk","night"]}'::jsonb),

  -- 12 · النفاخة / الارنب / puffer fish
  ('33333333-0000-0000-0000-000000000012',
   'Pufferfish',
   'سمكة النفاخة - الارنب - الصافي - puffer fish',
   'Lagocephalus lagocephalus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg-n7exrSlj2KM7zHtmrM51bFlgTO-bANvL7LXsG271CzwCfMHgQ8cVa90eMSB_i4Jceqikq84ZwdPkTSSUR12zE6UBi-ZBvFuHM2iq-zxfRGBvjtwAPfRfDOtsfaaJD43apz9k5rEY3Ob6/s320/20190616_033846.png',
   'The oceanic pufferfish, known as النفاخة or الارنب, inflates into a spiky ball when threatened. A nuisance bycatch for surf anglers, it bites through leaders with its powerful beak-like teeth. Do not eat — its organs contain tetrodotoxin. Always handle with care and return to the water.',
   '{"wind_max_kmh":30,"wave_max_m":2.0}'::jsonb),

  -- 13 · الراية / الراي / raya
  ('33333333-0000-0000-0000-000000000013',
   'Common Stingray',
   'الراية - الراي- raya',
   'Dasyatis pastinaca',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjf3UuJs2U5Oc_UA07KeZButBVXzynyjNwEOgIqjabjEk-hjgeWyIzQB9aH4OiH-e4V2b6ucLSMDNwhQLdLXPsVGAh5T4fXdsGpHCRqnqknsByzeyfhrMbPKjhTyjmpa6ZcT6y6HwvCf_Fn/s320/20190616_033337.png',
   'A flat-bodied ray called الراية or الراي, common on sandy beaches along the Souss-Massa coast. Lies buried in sand in calm, shallow water and feeds on shellfish and worms. Caught on bottom rigs with bait, its venomous tail spine requires great care when unhooking.',
   '{"tide_state":"high","wind_max_kmh":20,"wave_max_m":1.0}'::jsonb),

  -- 14 · الصول / soul
  ('33333333-0000-0000-0000-000000000014',
   'Common Sole',
   'الصول-soul',
   'Solea solea',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgNGZvll_0fzAaAZoG-FjoUHkp6Dfq0zlZo-Mu7e182Dj5JJYVBEj4_JVcFOSZTOJrigOFCns8ijuWkkjgF2G1npmrng05-OphSvMy0ZjXZq0jkdOl0ygAS-LwUFrobXdv-RMhoPHniIfU1/s320/20190616_034944.png',
   'A prized flatfish of sandy bottoms, known locally as الصول. Moves inshore on the rising tide after dark to feed on worms and small crustaceans. One of the most valued table fish in Morocco; targeting it requires patience on clean sandy ground with lugworm bait.',
   '{"tide_state":"rising","wind_max_kmh":20,"wave_max_m":1.0,"time_of_day":["dusk","night"]}'::jsonb),

  -- 15 · التيربو / turbo
  ('33333333-0000-0000-0000-000000000015',
   'Turbot',
   'التيربو- turbo',
   'Scophthalmus maximus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhSFwEztBj0xuMEZ_hsrMwluM1t7OGjCpsaHW091-aG0WChA3GhDQjl_wbEh4pCtt85CVhy8OGWmndXec8XeQwe6AFeuUSJwu9HimHv2hpA19GVS7tpRW8p7t7KJUmTNoaxA_Owsjy17GQG/s320/20190616_034916.png',
   'The turbot, called التيربو locally, is one of the largest and most prized flatfish of the Moroccan Atlantic. It ambushes small fish on sandy and mixed ground, often close to rocky edges. A trophy catch, best targeted with live sandeel or strip baits in calmer conditions.',
   '{"tide_state":"rising","wind_max_kmh":20,"wave_max_m":1.2,"time_of_day":["dawn","dusk"]}'::jsonb),

  -- 16 · المرينة / موراي / morai
  ('33333333-0000-0000-0000-000000000016',
   'Mediterranean Moray',
   'المرينة-موراي- marina- morai',
   'Muraena helena',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEitPi2QaBk7TcBuWm4C7nIykXVPghwnk5e1yRcftgJYCl1ld5yNVLlQk7rYf7sGgYwtw8qs-9AWEz7SjbShMdHJeINmMhiGRtBn7k5-LfxAcvwtxrNHNPbw4IF0pRUZ_TEkjmrmBdX7zc4W/s320/20190616_033503.png',
   'The Mediterranean moray eel, known as المرينة or موراي, inhabits crevices and caves in rocky ground. A powerful nocturnal predator with fearsome teeth and strong jaws — handle only with great care if landed. Found year-round on rocky Souss-Massa spots.',
   '{"wind_max_kmh":20,"wave_max_m":1.5,"time_of_day":["night","dusk"]}'::jsonb),

  -- 17 · سانبير / Saint-Pierre
  ('33333333-0000-0000-0000-000000000017',
   'John Dory',
   'سانبير-Saint-Pierre',
   'Zeus faber',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjiuyvclj8ZbF8lmCDlm-q-Rw8mbZ3G-1FzLOuGDKA0yrODK1g_DWaG-e0bg-y16HOy3Yqt_dRooCSDXulQEGn5f08mSk3kOrrB4OgvbGLpTvtVUTjoQvRdKKhwt4KS5ci2Mb_w6cTDBGAV/s320/20190616_034553.png',
   'The John Dory, called سانبير or Saint-Pierre, is instantly recognised by the dark oval "thumbprint" spot on its flank. A stealthy predator that drifts slowly before striking with a rapidly protruding jaw. A highly prized table fish, occasional along the Moroccan Atlantic coast.',
   '{"wind_max_kmh":20,"wave_max_m":1.2,"time_of_day":["dawn","dusk"]}'::jsonb),

  -- 18 · الفار / rat
  ('33333333-0000-0000-0000-000000000018',
   'Ratfish / Rabbitfish',
   'الفار-rat',
   'Chimaera monstrosa',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEigE5l4VSTe6lqW_PgGRKMCUZ7JhJgEUIuCtAcCCxzOU6OISdLxw8KmOOZBbRuEU4z40golt7AlipcHRnDipnVQDd5dEe6-WmOQ060kHaZ-1x1btF_BKkF0hzznypL61adFsWMYTNXHDCpw/s320/20190616_034751.png',
   'The ghost shark or ratfish, known locally as الفار, is a deep-water cartilaginous fish occasionally caught from shore on deep rocky ground. Its large eyes, tapering rat-like tail, and venomous dorsal spine make it unmistakable. An unusual bycatch along the deeper Souss-Massa headlands.',
   '{"wind_max_kmh":20,"wave_max_m":1.5,"time_of_day":["night"]}'::jsonb),

  -- 19 · بونيتو / bonito
  ('33333333-0000-0000-0000-000000000019',
   'Atlantic Bonito',
   'بونيتو-bonito',
   'Sarda sarda',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgt_3H_vMZLXS6ctGIEVVxvGIskZkTcUnPGitY9ZvaAwHTswseJ992fGipsYyMZw003ANg2VqLSeaRFmMMrgYX4IkW6LB7Uo84geEBMn6_kFAYaDs4Aprs6X8sGEJs4XHsOeKmTqwcGYwBy/s320/20190616_033642.png',
   'The Atlantic bonito, called بونيتو, is a fast pelagic predator that chases sardines and mackerel close to the Moroccan coast in late summer and autumn. Recognised by its horizontal stripes, it attacks surface lures and feathers with explosive speed. An exciting target from exposed rocks and headlands.',
   '{"wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["dawn","morning"]}'::jsonb),

  -- 20 · الميرو / الهامور / el miro
  ('33333333-0000-0000-0000-000000000020',
   'Dusky Grouper',
   'الميرو-الهامور-el miro',
   'Epinephelus marginatus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEizxydTK80IpPxZJ7VVxby0bq1n6adBrcRok8AfA4yATVHG5vhhCMEQ-5dZiygJRORzOYoaZxTZIzD-AX8J5FCES9DNGSsCYYvk9e2tYm6MIHHouFwmPr-tKGE19lnjOBjd3qW-CeuNgQHI/s320/20190616_034830.png',
   'The dusky grouper, called الميرو or الهامور, is a powerful, territorial predator of rocky reef ground. Can grow to large sizes and is a highly prized catch. A protected or regulated species in many areas — check local rules before keeping. Found on the deepest rocky marks of the Souss-Massa coast.',
   '{"wind_max_kmh":20,"wave_max_m":1.5,"time_of_day":["dawn","dusk"]}'::jsonb),

  -- 21 · الحجلة / el hajla
  ('33333333-0000-0000-0000-000000000021',
   'Banded Sea Bream',
   'الحجلة-el hajla',
   'Diplodus vulgaris',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh14BBF4jp-9oNX0-bo9qIGv6LK6lX28uhd0Am50_Hdzafz_mzCOXUNGa0e_qFwx2EZYJmSV-KdCdLrON0ovmp0SKyk9UdWtAz5IJEpZtKpRlUHpUfN4HHXSDZGU96lV_dBuLstROmZfiW3/s320/20190616_033713.png',
   'The two-banded sea bream, known as الحجلة, is identified by two distinct dark bands — one behind the head and one near the tail. A common and feisty species of rocky and sandy-rocky mixed ground, it feeds on worms, shellfish, and seaweed. A reliable target year-round on all spot types.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.5}'::jsonb),

  -- 22 · اولاح / awla7
  ('33333333-0000-0000-0000-000000000022',
   'Smooth Hound',
   'اولاح - awla7',
   'Mustelus mustelus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgvUzOqjoudkkG9Kl_urvuFepSUfEM7SvhLFPKaBmK6Lls7Ifia19FoYNgIK47HpD3r86KW4NRvk2GWrlnP3HOYj4jdWh8cggdrlhUDxFnSdF48H_99KBPX4gsF6Spq0Ijq-DR3W1r6UEGO/s320/20190616_033439.png',
   'The smooth hound shark, called اولاح, is a slender, elegant shark of sandy and mixed beaches. It feeds primarily on crustaceans and is a popular sport fish, putting up a strong fight on light tackle. Common in the Souss-Massa surf zone, especially on summer nights with a calm sea.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["night","dusk"]}'::jsonb),

  -- 23 · المعزة / Goat (goatfish)
  ('33333333-0000-0000-0000-000000000023',
   'Red Mullet',
   'المعزة-Goat',
   'Mullus surmuletus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgDfYzt1klgX_bSUY1xgfWIGCmvLLRSYPgwP6-pgZm8TpXzCsYQyCvLBpOeH0bI7ZMNcMGOpHdhrgMRzSuVzUTCYpyoQSWiT8iLmag9yZM1-Uta0I7oUXpxl4PoibK-buHuYhaWatqbNYJj/s320/20190616_035036.png',
   'The striped red mullet, nicknamed المعزة (the goat) for its chin barbels, uses those sensitive feelers to probe sand for worms and crustaceans. A brightly coloured and very tasty fish, it is caught on light bottom rigs over sandy and mixed ground. A prized bycatch and target on Moroccan beaches.',
   '{"tide_state":"rising","wind_max_kmh":20,"wave_max_m":1.0}'::jsonb),

  -- 24 · الدانتي / dante
  ('33333333-0000-0000-0000-000000000024',
   'Common Dentex',
   'الدانتي- dante',
   'Dentex dentex',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjsUagptb-8zQcWv-0ynuLYwu6FdP3ZYwXi0-ptIgMgunuMH8cai9FnKC9r2VCCY01Luk20iO4dq5_SwAwkGgbIcWAzIfHD7N9H5w1M9jjjFeDnVQhpTxtop9ouJv77Gcv98PQ7IchqHIJz/s320/20190616_033745.png',
   'The common dentex, called الدانتي, is a powerful and fast predator of rocky reef ground. Recognised by its large canine teeth and muscular, blue-tinged body. A trophy species that puts up an impressive fight; targeted with live bait and large lures from deep rocky marks along the Souss-Massa headlands.',
   '{"wind_max_kmh":20,"wave_max_m":1.5,"time_of_day":["dawn","dusk"]}'::jsonb),

  -- 25 · الدوراد / زريقة / امون / dorade-lorata-zrika-amoun
  ('33333333-0000-0000-0000-000000000025',
   'Gilthead Bream',
   'الدوراد-زريقة-امون-المحرقصة-dorade-lorata-zrika-amoun',
   'Sparus aurata',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjuZ7JQHfqRungvFitfWWGn2cxx_rndFHDiQ-k1tYr-KIiKJfZXHOqCIHEa4jVdzNxtgMt2sRUPVUiGnp-Wz7_zXxlP7X5BKgDhoaY_jse75LoMZGHmKH8ezHhVdl4zv2_4P4FqLBG7vunC/s320/20190616_034625.png',
   'The gilthead bream — called الدوراد, زريقة, or امون depending on the region — is identified by the golden band between its eyes. A powerful, stubborn fighter on sandy and mixed bottoms, it crushes shellfish and crabs with robust molar-like teeth. One of the most valued food fish on the Moroccan Atlantic coast.',
   '{"tide_state":"high","wind_max_kmh":20,"wave_max_m":1.2}'::jsonb),

  -- 26 · شرغو / sar
  ('33333333-0000-0000-0000-000000000026',
   'White Sea Bream',
   'شرغو-sar',
   'Diplodus sargus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiuPgyL3lsOPa_QdFbX0lWhmIR-BEZC39szIWq4_nfPFff8-t4JzjRJpcXRWh9MVkzkWe_QxMEWgvq7c2p-zYDQLhlAsMbaOBLiJrqm7pXL25zx7jnBdY4APjKJjDPXdmh6WPIkESvQrjKe/s320/20190616_035321.png',
   'The white sea bream, called شرغو or sar, is a bold and widely distributed species of rocky and sandy-rocky ground. Its vertical black-and-silver barring makes it easy to identify. A year-round resident of the Souss-Massa coast, it feeds on shellfish and algae and is caught on a wide range of baits.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.5}'::jsonb),

  -- 27 · بولبرادع / فوم شيخ / boulbrada3
  ('33333333-0000-0000-0000-000000000027',
   'Annular Sea Bream',
   'بولبرادع- فوم شيخ-boulbrada3',
   'Diplodus annularis',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjRP1K_MwoxRgcCmlaMTrN99pzyaSiXCQhxCtpl_KyO745Kxz5F2Kcf7j2na97uyRYiEdOSc2CInqVvjiQw69AYioQP3Tos8dCfWa21WWJ0YFsZl3A9l12CU9mA9GhkPIncgWaLfhWNto8P/s320/20190616_034646.png',
   'The annular sea bream, locally called بولبرادع or فوم شيخ, is a small and abundant bream recognised by a black ring at the tail base. Common in shallow rocky and weedy areas, it bites readily on small baits and is a favourite species for light-tackle fishing from the rocks. Present year-round.',
   '{"wind_max_kmh":25,"wave_max_m":1.5}'::jsonb),

  -- 28 · الاخطبوط / ازايز / الروطال / octopus
  ('33333333-0000-0000-0000-000000000028',
   'Common Octopus',
   'الاخطبوط-ازايز-الروطال-octopus',
   'Octopus vulgaris',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj8fHH_eUEOI4FOGUw-rVMM6Lu0WY-keaqj09NW08q8-bTjpB8sHZHnkKNDjtDrNQ6dxjgqqkvt5DgJYaWkH3MgKz23SWSMpicAz_ahL_W2xWr15OLHw-yma_noY3uEJNWGJLEKy4Naxmrh/s320/20190616_035238.png',
   'The common octopus — called الاخطبوط, ازايز, or الروطال — is a staple of Moroccan rocky shores. A master of camouflage, it hides among rocks and crevices waiting to ambush prey. Most catchable in calm, clear conditions using jigs (جيكو) or by hand-lining into holes. A culturally important food species.',
   '{"wind_max_kmh":18,"wave_max_m":0.8,"time_of_day":["dawn","dusk","night"]}'::jsonb),

  -- 29 · كلمار / الكاليماري / kalamar
  ('33333333-0000-0000-0000-000000000029',
   'European Squid',
   'كلمار-الكاليماري-الحبار- kalamar-kalimar',
   'Loligo vulgaris',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhfGVaKAVYqWHOmYWaYDICIeRDqI28VaZky5YF4Fn_yvh7r7cUStXqREbWFSO-LBa2zxaTOZpZwkI4YFZB4hrmxtoJBikeeSQ-D1EHl5E2bUrO-fjz5mCfXuJS7Ih40MH0kOIAstAeTewUM/s320/20190616_035212.png',
   'The European squid, called كلمار or الكاليماري, forms schools near the surface and in midwater along the Moroccan coast, especially under lights at night. Targeted with EGI squid jigs and small lures, it is an excellent food species and also used as bait for larger predators. Most abundant in autumn and winter.',
   '{"wind_max_kmh":20,"wave_max_m":1.0,"time_of_day":["night","dusk"]}'::jsonb),

  -- 30 · سيبيا / الخثاق / الحبار / sepia
  ('33333333-0000-0000-0000-000000000030',
   'Common Cuttlefish',
   'سيبيا-الخثاق-سوبيا-الحبار-sepia',
   'Sepia officinalis',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj5SIx6oOrX2B3GDhu7PwRNL6B4gWIqCNbe-T81EWg0fOwoLGXHnm-LWSrWP5-XBT9ch2QKsyj0vLKR07IjA3BkqfmFv-Vv0kZxVmqwmjd11Ph9D-HuruBuzcPq5RMcR1kaVVFv5mgFxJer/s320/20190616_035540.png',
   'The common cuttlefish, known locally as سيبيا or الخثاق, moves inshore in spring and autumn to breed in shallow rocky and weedy habitats. Targeted with EGI jigs in calm conditions, it is a superb eating species and highly valued in Moroccan coastal cuisine. Ink-squirting defence is normal — keep it away from clothing.',
   '{"wind_max_kmh":18,"wave_max_m":0.8,"time_of_day":["dawn","dusk"]}'::jsonb),

  -- 31 · توينبة / twinba
  ('33333333-0000-0000-0000-000000000031',
   'Painted Comber',
   'توينبة-twinba',
   'Serranus scriba',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhdgHM2vOxtOL9KU0yfVrSpvSQYdiadBi4cAgmj0AQ8IwnEBky-PO07oCmHD1KgO-FZfCk1hj82_Elmt7S9dUjvzeluJ7Rzio4D1IfP4PCHYSzBZbZ3k0xn0DZ3v86EBtAnfEdFeY5uwtga/s320/20190616_033808.png',
   'The painted comber, called توينبة locally, is a small and vividly patterned grouper relative of shallow rocky and weedy ground. Identifiable by its colourful marbled markings and a distinctive blue spot on its belly. A bold biter, common year-round on rocky Souss-Massa spots.',
   '{"wind_max_kmh":25,"wave_max_m":1.5}'::jsonb),

  -- 32 · حلامة / 7lama
  ('33333333-0000-0000-0000-000000000032',
   'Smooth Sole',
   'حلامة -7lama',
   'Pegusa lascaris',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhDstBwQ5RSPWpl0fLGmOzysqBvNb_czwAF0ZjIJiRcR2V9dp0476-W7iQx5aRp5fPVETMhcfhYKHSe2vLkUMcuO5aMhUBLE3oOMbGcgG3vnzam89Xnmrd_F4FlvgTJMqNy9WnIXANwfzvp/s320/20190616_035434.png',
   'The sand sole, called حلامة, is a smaller flatfish of sandy beaches similar to the common sole but rougher-skinned. It buries in clean sand close to shore and is most active after dark. Caught on fine bottom rigs baited with ragworm, it is a quality table fish well known to local Moroccan anglers.',
   '{"tide_state":"rising","wind_max_kmh":18,"wave_max_m":0.8,"time_of_day":["night","dusk"]}'::jsonb),

  -- 33 · الرمولي / الحنبل / المرمار / Marbré
  ('33333333-0000-0000-0000-000000000033',
   'Marbled Sea Bream',
   'االرمولي-الحنبل-المرمار-تاكبا - Marbré',
   'Lithognathus mormyrus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhpg3oU1AyE6a-wpq4A4jO_XvIE7HTgCsiEB4_hnHSpmuO_9hLec3R9NDBIYAh0FCmCkZQ99k_v7gxrjgziJLzGcAGNKMU6NszIZ3iZ5JvOvJ9JlwBSx17kPtMyuS4z45fN9DYQeh8ck3pk/s320/20190616_034715.png',
   'The marbled bream — called الرمولي, الحنبل, or المرمار — is a surf specialist of clean sandy beaches. Its vertical dark bars give it a marbled look. It roots through sand for worms, small crabs, and shellfish on a moving tide. One of the most regularly encountered species on Souss-Massa sand beaches.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.5}'::jsonb),

  -- 34 · اناناز / الدنيس / Griset
  ('33333333-0000-0000-0000-000000000034',
   'Black Sea Bream',
   'اناناز - الدنيس - Griset',
   'Spondyliosoma cantharus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiy_AP5zpiAutG_UoOnRZNL2Mol_cPXgN74b0pfG6VJW_Mwxdklmjdc2IHG0zG3kJb8tLj2q8kS0tsyOR8c_dR2WAxkN0dPojgTb2sU87GWJADmRaw_z3FTh7w-_PzAs8psRQeHYDV6ikWY/s320/20190616_035011.png',
   'The black sea bream, called الدنيس or griset, has a deep body and greyish silver colouring with faint horizontal stripes. Found on rocky and weedy mixed ground, it feeds on algae, invertebrates, and small fish. Males guard nests in spring. A quality table fish caught year-round on the Moroccan Atlantic coast.',
   '{"tide_state":"rising","wind_max_kmh":25,"wave_max_m":1.5}'::jsonb),

  -- 35 · الشخار / chekhar
  ('33333333-0000-0000-0000-000000000035',
   'Gilt-head Porgy / Sharpsnout Bream',
   'الشخار-chekhar',
   'Diplodus puntazzo',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiZPuFffelmTE0y44Iixkbk_5FEKcfdYy5rgFrMtRridMG6whSdLKwPDzapS0aVLjxKPEBatOfBYb-blMvm8OeUkNao7OTyK9fGzQ3-EO5O9_R6wk8AZeaECZiti4Xt856m-lWPg81EJB6D/s320/20190616_033926.png',
   'The sharpsnout sea bream, called الشخار locally, has a distinctively pointed snout and prominent vertical stripes. A cautious and clever feeder on rocky and weedy ground, it picks at baits delicately and requires fine tackle to hook reliably. A sought-after sport fish along the Souss-Massa coast.',
   '{"wind_max_kmh":20,"wave_max_m":1.2}'::jsonb),

  -- 36 · السردين / sardine
  ('33333333-0000-0000-0000-000000000036',
   'European Sardine',
   'السردين - sardine',
   'Sardina pilchardus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg33wJh5jH9vJx8D80cWl0LtFH8PoKWmQsoV4A6XeAEcKYYT_xe-1XZpRfk8CZNmTiNVMr7e63-uSzEZjdVBDh9qiC8lJzx3VTi54k8ZUpcuQ5jZhnGvQuWygt9mA2TJmBBThMvkwgPPl75/s320/20190616_034856.png',
   'The European sardine, called السردين, is one of the most abundant pelagic fish of the Moroccan Atlantic and the backbone of Agadir''s fishing industry. Dense schools move close to shore in cooler months. Caught on sabiki rigs and small nets, sardines are also the most important live and cut bait for targeting larger predators.',
   '{"wind_max_kmh":25,"wave_max_m":1.5,"time_of_day":["dawn","morning","dusk"]}'::jsonb),

  -- 37 · بوقة / bo9a
  ('33333333-0000-0000-0000-000000000037',
   'European Conger',
   'بوقة-bo9a',
   'Conger conger',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgouRbEYuGCg9dQxrncwHy6pPDmMsYJ7ammELQ1Yb0Zl5cH03F3bD3HBE_a8OZNRmDa7xQKyQr4WWD4AGuqRfQB5nNXNvvqflHyrs3EZECxk32CPF08akoSS8ir2LpkDFM0RgrOTYLNt3WS/s320/20190616_035126.png',
   'The conger eel, known locally as بوقة, is a powerful and muscular nocturnal predator of rocky ground and harbour walls. Can grow to impressive sizes and is highly prized as a food fish. Most active after dark, it requires strong tackle and a wire or heavy mono trace to avoid bite-offs.',
   '{"wave_max_m":2.0,"time_of_day":["night","dusk"]}'::jsonb),

  -- 38 · الحداد / el 7adad
  ('33333333-0000-0000-0000-000000000038',
   'Saddled Bream',
   'الحداد-el 7adad',
   'Oblada melanura',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjXhh79-W2O3LDwcrPpz2p9He6ybnr4AQc2WYHhiu2FohUXiqoru770KRqVt8HC113O4G0gtTwOEabQjwlKaxV6YCKJk-54f6J9vl6l_nQomUYgmB6kkzRGzaNIxFp23-UetzOVChp4shkR/s320/20190616_035401.png',
   'The saddled bream, called الحداد, is immediately recognised by the bold black oval saddle at the base of its tail. An extremely common species of rocky and weedy shores, it swims in shoals close to the surface. Easy to catch on small baits and floats, it is a great entry-level species and a lively table fish.',
   '{"wind_max_kmh":30,"wave_max_m":2.0}'::jsonb),

  -- 39 · باجو رويال / روكيرة / pajou
  ('33333333-0000-0000-0000-000000000039',
   'Greater Amberjack',
   'باجو رويال-روكيرة-pajou',
   'Seriola dumerili',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgHDy2Dt4rXcEgvSeiwjAw1Lkl5oTr41RUIkxTy89RFuj53odUxuYjDHktWHoPpallCW3qgpwoNSYRRhNcLrxn_sIuxuiWMHBer5HSg-C0XrbR6YUuPMeo0_gUy6QRSTsRaeB3-8xXUiDZ_/s320/pqjo-removebg-preview.png',
   'The greater amberjack, called باجو رويال or pajou, is one of the most powerful pelagic sport fish of the Moroccan Atlantic. A hard-running, deep-diving predator that hunts around offshore rocks and headlands, it attacks large lures and live baits with tremendous force. A trophy species that tests tackle and angler alike.',
   '{"wind_max_kmh":25,"wave_max_m":2.0,"time_of_day":["dawn","morning","dusk"]}'::jsonb),

  -- 40 · البوري / ثكاوة / tagawa / bouri
  ('33333333-0000-0000-0000-000000000040',
   'Striped Mullet',
   'البوري-ثكاوة-tagawa-bouri',
   'Mugil cephalus',
   'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgmSN2J5bUEBCo7hl71aeJlwtExltCBL_qegaOslc9Q-4uzdj2tKO_SuJu_Q5P9h_0T3r2-leGVZsPzFmQGmOuw0Tg34nfEtNGgYUfaG7PJawHMg_SvJpRPxGkEkxWAx5oz8Kyp1Hs8bbJB/s320/bori.png',
   'The striped mullet, called البوري or ثكاوة, is one of the most abundant fish of Moroccan estuaries, lagoons, and surf beaches. Schools can be seen rolling and jumping at the surface. A challenging species to target on hook and line as it feeds on algae and detritus; bread and dough baits on a float are the most effective approach.',
   '{"wind_max_kmh":35,"wave_max_m":2.5}'::jsonb)

on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Per-spot species presence (spot_species)
--    Keeping the same 6 spots. New species IDs used throughout.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.spot_species (spot_id, species_id, season_months, prevalence, notes)
select s.id, x.species_id, x.season_months, x.prevalence::prevalence, x.notes
from (values

  -- ── Sidi R'bat (beach, river-mouth influence) ──────────────────────────────
  ('sidi-rbat', '33333333-0000-0000-0000-000000000001', '{4,5,6,7,8,9}'::smallint[],     'common',     'Strong corbina runs near the Massa river mouth on rising tides.'),
  ('sidi-rbat', '33333333-0000-0000-0000-000000000006', '{1,2,3,10,11,12}'::smallint[],  'common',     'Sea bass hunt the sandbars in cooler months.'),
  ('sidi-rbat', '33333333-0000-0000-0000-000000000040', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Mullet year-round in the surf and near the estuary.'),
  ('sidi-rbat', '33333333-0000-0000-0000-000000000014', '{3,4,5,9,10}'::smallint[],      'occasional', 'Sole on calm evenings over the sand.'),
  ('sidi-rbat', '33333333-0000-0000-0000-000000000005', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Striped bream (ابلاغ) reliably present in the surf year-round.'),
  ('sidi-rbat', '33333333-0000-0000-0000-000000000022', '{5,6,7,8,9}'::smallint[],       'occasional', 'Smooth hound active on summer nights.'),
  ('sidi-rbat', '33333333-0000-0000-0000-000000000013', '{4,5,6,7,8,9}'::smallint[],     'occasional', 'Stingray buried in the sand on calm days.'),
  ('sidi-rbat', '33333333-0000-0000-0000-000000000036', '{10,11,12,1,2,3}'::smallint[],  'common',     'Sardine schools close inshore in winter.'),

  -- ── Tifnit (rocks) ─────────────────────────────────────────────────────────
  ('tifnit', '33333333-0000-0000-0000-000000000028', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',     'Octopus among the rocks year-round.'),
  ('tifnit', '33333333-0000-0000-0000-000000000037', '{5,6,7,8,9}'::smallint[],          'occasional', 'Conger (بوقة) after dark off the rocks.'),
  ('tifnit', '33333333-0000-0000-0000-000000000006', '{1,2,3,10,11,12}'::smallint[],     'occasional', 'Bass around the rocky edges in winter.'),
  ('tifnit', '33333333-0000-0000-0000-000000000002', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',     'Scorpionfish (رascasse) hiding in rock crevices year-round.'),
  ('tifnit', '33333333-0000-0000-0000-000000000020', '{5,6,7,8,9}'::smallint[],          'rare',       'Dusky grouper on the deeper rocky sections in summer.'),
  ('tifnit', '33333333-0000-0000-0000-000000000021', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',     'Banded sea bream (الحجلة) on all rocky sections.'),
  ('tifnit', '33333333-0000-0000-0000-000000000026', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',     'White sea bream (شرغو) year-round from the rocks.'),
  ('tifnit', '33333333-0000-0000-0000-000000000016', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'occasional', 'Moray eel in deep crevices.'),
  ('tifnit', '33333333-0000-0000-0000-000000000039', '{6,7,8,9}'::smallint[],            'rare',       'Amberjack (باجو) passes summer headlands.'),
  ('tifnit', '33333333-0000-0000-0000-000000000019', '{8,9,10}'::smallint[],             'occasional', 'Bonito chasing sardines close to the rocks in autumn.'),

  -- ── Douira (mixed beach + rock) ────────────────────────────────────────────
  ('douira', '33333333-0000-0000-0000-000000000025', '{4,5,6,7,8,9,10}'::smallint[],    'common',     'Gilthead bream over sand and mixed bottom.'),
  ('douira', '33333333-0000-0000-0000-000000000040', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Reliable mullet in the surf and channels.'),
  ('douira', '33333333-0000-0000-0000-000000000001', '{5,6,7,8}'::smallint[],           'occasional', 'Summer corbina in the surf.'),
  ('douira', '33333333-0000-0000-0000-000000000033', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Marbled bream (الرمولي) a staple of the sandy sections.'),
  ('douira', '33333333-0000-0000-0000-000000000023', '{3,4,5,6,7,8,9,10}'::smallint[],  'common',     'Red mullet (المعزة) working the sandy bottom.'),
  ('douira', '33333333-0000-0000-0000-000000000009', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'occasional', 'Small-spotted catshark on bottom rigs after dark.'),
  ('douira', '33333333-0000-0000-0000-000000000008', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',   'Comber (الصنور) on the rocky patches.'),

  -- ── Am9erss (open sandy beach) ─────────────────────────────────────────────
  ('massa', '33333333-0000-0000-0000-000000000001', '{4,5,6,7,8,9}'::smallint[],        'common',     'Corbina in the surf on rising tides along the open sand.'),
  ('massa', '33333333-0000-0000-0000-000000000040', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Mullet year-round in the surf.'),
  ('massa', '33333333-0000-0000-0000-000000000006', '{1,2,3,10,11,12}'::smallint[],     'common',     'Sea bass hunting the sandbars in cooler months.'),
  ('massa', '33333333-0000-0000-0000-000000000014', '{3,4,5,9,10}'::smallint[],         'occasional', 'Sole on the clean sand after dark.'),
  ('massa', '33333333-0000-0000-0000-000000000022', '{5,6,7,8,9}'::smallint[],          'occasional', 'Smooth hound in the surf on summer nights.'),
  ('massa', '33333333-0000-0000-0000-000000000013', '{4,5,6,7,8,9}'::smallint[],        'occasional', 'Stingray buried in the sandy bottom on calm days.'),

  -- ── Sidi Boulfdail (exposed beach) ─────────────────────────────────────────
  ('sidi-boulfdail', '33333333-0000-0000-0000-000000000006', '{1,2,3,10,11,12}'::smallint[], 'common',     'Surf bass on the open exposed beach.'),
  ('sidi-boulfdail', '33333333-0000-0000-0000-000000000004', '{11,12,1,2,3}'::smallint[],    'occasional', 'Winter chub mackerel shoals.'),
  ('sidi-boulfdail', '33333333-0000-0000-0000-000000000040', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Mullet in the surf year-round.'),
  ('sidi-boulfdail', '33333333-0000-0000-0000-000000000033', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Marbled bream a reliable surf species.'),
  ('sidi-boulfdail', '33333333-0000-0000-0000-000000000005', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common', 'Striped bream (ابلاغ) in the clean surf.'),
  ('sidi-boulfdail', '33333333-0000-0000-0000-000000000036', '{10,11,12,1,2,3}'::smallint[],  'common',    'Sardine close inshore in winter.'),
  ('sidi-boulfdail', '33333333-0000-0000-0000-000000000001', '{4,5,6,7,8,9}'::smallint[],     'occasional', 'Corbina in the summer surf.'),

  -- ── Aglou (beach + rock) ───────────────────────────────────────────────────
  ('aglou', '33333333-0000-0000-0000-000000000025', '{4,5,6,7,8,9,10}'::smallint[],     'common',     'Gilthead bream near the rock formations.'),
  ('aglou', '33333333-0000-0000-0000-000000000028', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'occasional', 'Octopus on the rocky patches.'),
  ('aglou', '33333333-0000-0000-0000-000000000004', '{11,12,1,2,3}'::smallint[],        'occasional', 'Chub mackerel in cooler months.'),
  ('aglou', '33333333-0000-0000-0000-000000000021', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',     'Banded sea bream (الحجلة) on the rocky sections.'),
  ('aglou', '33333333-0000-0000-0000-000000000026', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',     'White sea bream (شرغو) year-round.'),
  ('aglou', '33333333-0000-0000-0000-000000000030', '{3,4,5,9,10}'::smallint[],         'occasional', 'Cuttlefish (سيبيا) close inshore in spring and autumn.'),
  ('aglou', '33333333-0000-0000-0000-000000000002', '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[], 'common',     'Scorpionfish on the rocky ground year-round.'),
  ('aglou', '33333333-0000-0000-0000-000000000024', '{5,6,7,8,9}'::smallint[],          'occasional', 'Common dentex (الدانتي) on the deeper rocky edges in summer.'),
  ('aglou', '33333333-0000-0000-0000-000000000019', '{8,9,10}'::smallint[],             'occasional', 'Bonito in autumn chasing baitfish close to the headland.')

) as x(spot_slug, species_id, season_months, prevalence, notes)
join public.spots s on s.slug = x.spot_slug
on conflict (spot_id, species_id) do nothing;