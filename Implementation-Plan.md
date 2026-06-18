# FishCast V2 Implementation Plan

This is a marine fishing intelligence platform focused on **Chtouka Aït Baha and the Souss-Massa region of Morocco**. Below is a detailed, phased implementation plan derived from the README blueprint. No code generated yet, as requested.

#### Overview & Architecture Principles

The plan follows the README's **"one feature at a time"** rule, with a `npm run build` and commit checkpoint after each feature. The flagship deliverable is the **Marine Timeline** (Phase 7), so earlier phases should produce clean, interpolation-ready data structures to support it. The architecture separates **deterministic logic** (scoring engine, difficulty, best-window calculations) from **interpretive AI** (Gemini), which never invents data.

Three capabilities are woven throughout this plan:

- **Species tracking** — which fish are present/targetable at each spot and season, and what conditions favor them.
- **Spot difficulty levels** — how accessible and demanding each spot is (Beginner → Expert), driven by terrain, access, and conditions.
- **Automatic best fishing window calculations** — deterministic detection of the day's optimal fishing periods from the interpolated 5-minute timeline.

All three stay scoped to Chtouka Aït Baha and Souss-Massa, with the schema designed to expand later.

---

#### Folder Structure

A feature-oriented Next.js 15 App Router layout:

```
fishcastv2/
├── src/
│   ├── app/
│   │   ├── (auth)/login/            # Auth routes
│   │   ├── (main)/
│   │   │   ├── map/                 # Interactive map page
│   │   │   ├── spots/[id]/          # Spot details page
│   │   │   ├── species/             # Species catalog + per-spot species
│   │   │   └── favorites/
│   │   ├── api/
│   │   │   ├── weather/             # Weather/marine proxy routes
│   │   │   ├── score/               # Scoring endpoint
│   │   │   ├── timeline/            # Interpolated timeline data
│   │   │   ├── windows/             # Best fishing window calculations
│   │   │   ├── species/             # Species + spot-species data
│   │   │   └── ai/                  # Gemini interpretation
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                      # Shadcn primitives
│   │   ├── map/                     # Leaflet markers, clustering
│   │   ├── timeline/                # Scrubber, charts, window highlights
│   │   ├── spot/                    # Cards, hero, conditions, difficulty badge
│   │   ├── species/                 # Species cards, seasonality, filters
│   │   └── shared/                  # Skeletons, animations
│   ├── lib/
│   │   ├── supabase/                # Client + server clients
│   │   ├── scoring/                 # Deterministic score engine
│   │   ├── difficulty/              # Spot difficulty calculation
│   │   ├── windows/                 # Best fishing window detection
│   │   ├── species/                 # Species suitability logic
│   │   ├── marine/                  # API adapters, interpolation
│   │   ├── ai/                      # Gemini prompt builders
│   │   └── utils/
│   ├── hooks/                       # TanStack Query hooks
│   ├── types/                       # Shared TS types
│   └── config/                      # Theme, constants, region data
├── supabase/
│   ├── migrations/
│   └── seed/                        # Chtouka Aït Baha / Souss-Massa seed data
└── public/markers/
```

#### Database Architecture (Supabase / PostgreSQL)

Core tables, designed for expansion beyond the initial region:

- **`profiles`** — extends `auth.users`; `id`, `display_name`, `avatar_url`, `created_at`.
- **`regions`** — `id`, `name` (e.g. "Souss-Massa"), `country`, `bounds`. Enables future expansion.
- **`spots`** — `id`, `region_id` (FK), `name`, `lat`, `lng` (or `geography(Point)` with PostGIS), `type` (enum: beach, rocks, port, river_mouth, pier), `description`, `difficulty_level` (enum: beginner, intermediate, advanced, expert), `difficulty_factors` (jsonb: access, terrain, swimming/hazard notes), `created_at`.
- **`spot_photos`** — `id`, `spot_id` (FK), `url`, `position`.
- **`favorites`** — `user_id` (FK), `spot_id` (FK), composite PK.
- **`condition_snapshots`** — `id`, `spot_id` (FK), `captured_at`, `tide_height`, `tide_state`, `wind_speed`, `wind_dir`, `wave_height`, `weather` (jsonb), `source`. Stores fetched marine data.
- **`community_reports`** — `id`, `spot_id` (FK), `user_id` (FK), `species_id` (FK, nullable), `catch_count`, `notes`, `rating`, `created_at`. Feeds the score engine and species presence.
- **`score_cache`** — optional: `spot_id`, `computed_at`, `score`, `factors` (jsonb) for performance.

**Species tracking tables:**

- **`species`** — `id`, `common_name`, `local_name` (Darija/French where relevant), `scientific_name`, `image_url`, `description`, `preferred_conditions` (jsonb: ideal tide_state, wind range, wave range, time of day). Catalog scoped to species found in Souss-Massa.
- **`spot_species`** — junction: `spot_id` (FK), `species_id` (FK), `season_months` (int[] 1–12), `prevalence` (enum: common, occasional, rare), `notes`. Composite PK `(spot_id, species_id)`.
- **`best_windows`** *(optional cache)* — `id`, `spot_id` (FK), `date`, `windows` (jsonb: array of `{ start, end, peak_score, label }`), `computed_at`. Caches the daily best-window calculation.

**RLS policies:** public read on `spots`/`regions`/`spot_photos`/`species`/`spot_species`; authenticated write on `favorites`/`community_reports`; users can only modify their own rows.

#### API Architecture

Use **Next.js Route Handlers** as a proxy layer so external API keys stay server-side and responses are normalized + cached in `condition_snapshots`:

- `GET /api/weather?spotId=` — fetches weather/wind/wave/tide, normalizes, persists snapshot.
- `GET /api/timeline?spotId=&date=` — returns forecast points **interpolated to 5-minute increments** (the timeline's data backbone).
- `GET /api/windows?spotId=&date=` — runs the **best fishing window** calculation over the interpolated timeline and returns ranked windows with start/end/peak/label.
- `GET /api/species?spotId=` — returns species present at a spot with seasonality and prevalence; `GET /api/species` returns the regional catalog.
- `POST /api/score` — runs the deterministic engine on a condition set, returns score (0–10) + factor breakdown + label.
- `POST /api/ai/recommend` — sends *only* structured marine data + score + active species + windows to Gemini, returns an interpretive sentence. Guardrails prevent data invention.

TanStack Query handles all client fetching, caching, and background revalidation.

---

#### Feature Logic Details

**Spot difficulty levels** — Computed in `lib/difficulty` from static spot attributes (access, terrain/spot type, known hazards) combined optionally with live conditions (high waves/wind raise effective difficulty). Output is one of: `Beginner`, `Intermediate`, `Advanced`, `Expert`, plus a factor breakdown shown as a badge on spot cards and the details page.

**Species tracking** — Each spot lists its targetable species with seasonality (`season_months`) and prevalence. `lib/species` cross-references a species' `preferred_conditions` against current/timeline conditions to flag which species are *favored right now*. Community reports with a `species_id` reinforce real-world presence over time.

**Automatic best fishing window calculations** — Deterministic, runs in `lib/windows` over the 5-minute interpolated timeline. For each increment it uses the existing fishing score, then detects contiguous runs above thresholds to produce ranked windows (`Excellent`/`Good`/`Moderate`), each with `start`, `end`, peak time, and peak score. These windows drive the timeline highlights and answer "when should I fish today?". Optionally cached per spot per day in `best_windows`.

---

#### Phased Implementation Plan

**Phase 1 — Foundation & Design System**
- Init Next.js 15 + TypeScript + Tailwind + Shadcn + Framer Motion.
- Build dark ocean theme tokens (colors, typography, spacing).
- Create base layout, skeleton loaders, premium card primitives.
- *Milestone:* runnable app with design system; no business logic.

**Phase 2 — Supabase & Auth**
- Create migrations for all tables above (including `species`, `spot_species`, and `spots.difficulty_level`); enable RLS.
- Wire Supabase server/client; implement email + Google login.
- Protected actions and favorites scaffolding.
- *Milestone:* user can sign in; full schema deployed.

**Phase 3 — Map & Spots**
- Leaflet/OpenStreetMap dark ocean-style tiles, custom markers, clustering, animations.
- Seed Chtouka Aït Baha / Souss-Massa spots only (Sidi R'bat, Tifnit, Douira, Massa, Sidi Boulfdail, Aglou) with `difficulty_level` set.
- Show difficulty badge on map markers/popovers and spot cards.
- *Milestone:* map renders real local spots with difficulty, mobile-friendly.

**Phase 4 — Spot Details Page**
- Hero image, conditions layout, difficulty breakdown, community reports section (static data shells).
- *Milestone:* navigable spot page communicating good/bad and difficulty at a glance.

**Phase 5 — Weather & Marine Data**
- Integrate weather/wind/wave/tide APIs via proxy routes; persist snapshots.
- Populate spot details with live data; apply condition-aware difficulty adjustment.
- *Milestone:* real marine data displayed and stored.

**Phase 6 — Fishing Score Engine**
- Deterministic, testable scoring from tide/wind/waves/weather/community/catches.
- 0–10 score, labels, factor breakdown UI.
- *Milestone:* reproducible scores with unit tests.

**Phase 7 — Marine Timeline + Best Windows (Flagship)**
- 5-minute scrubber with interpolation; synced tide/wind/wave/score updates.
- Tide curve, wind/wave/score charts.
- **Best fishing window calculation** runs over the timeline and highlights Excellent/Good/Moderate/Poor periods automatically.
- *Milestone:* the standout feature answering "when should I fish today?".

**Phase 8 — Species Tracking**
- Species catalog + per-spot species with seasonality and prevalence.
- Species cards on spot page; "favored now" flags cross-referencing live/timeline conditions.
- Link community reports to species.
- *Milestone:* users see what to catch, when, and which species suit current conditions.

**Phase 9 — Gemini Integration**
- Prompt builder fed only by structured data + score + active species + best windows; strict no-invention guardrails.
- AI recommendation on spot page and timeline.
- *Milestone:* contextual interpretive text, no hallucinated data.

**Phase 10 — Polish & Performance**
- Animation refinement, performance optimization, responsive QA, final review.
- *Milestone:* premium consumer-grade product ready.

---

Recommended next step: track this as work items in the project. I can create an **epic** for FishCast V2 with one **issue per phase** (acceptance criteria included), or scaffold **Phase 1** when you're ready. Which would you like?
