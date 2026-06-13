# FishCast V2 Implementation Plan

This is a marine fishing intelligence platform for the Souss-Massa region of Morocco. Below is a detailed, phased implementation plan derived from the README blueprint. No code generated yet, as requested.

#### Overview & Architecture Principles

The plan follows the README's **"one feature at a time"** rule, with a `npm run build` and commit checkpoint after each feature. The flagship deliverable is the **Marine Timeline** (Phase 7), so earlier phases should produce clean, interpolation-ready data structures to support it. The architecture separates **deterministic logic** (scoring engine) from **interpretive AI** (Gemini), which never invents data.

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
│   │   │   └── favorites/
│   │   ├── api/
│   │   │   ├── weather/             # Weather/marine proxy routes
│   │   │   ├── score/               # Scoring endpoint
│   │   │   ├── timeline/            # Interpolated timeline data
│   │   │   └── ai/                  # Gemini interpretation
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                      # Shadcn primitives
│   │   ├── map/                     # Mapbox markers, clustering
│   │   ├── timeline/                # Scrubber, charts
│   │   ├── spot/                    # Cards, hero, conditions
│   │   └── shared/                  # Skeletons, animations
│   ├── lib/
│   │   ├── supabase/                # Client + server clients
│   │   ├── scoring/                 # Deterministic score engine
│   │   ├── marine/                  # API adapters, interpolation
│   │   ├── ai/                      # Gemini prompt builders
│   │   └── utils/
│   ├── hooks/                       # TanStack Query hooks
│   ├── types/                       # Shared TS types
│   └── config/                      # Theme, constants, region data
├── supabase/
│   ├── migrations/
│   └── seed/                        # Souss-Massa spot seed data
└── public/markers/
```

#### Database Architecture (Supabase / PostgreSQL)

Core tables, designed for expansion beyond the initial region:

- **`profiles`** — extends `auth.users`; `id`, `display_name`, `avatar_url`, `created_at`.
- **`regions`** — `id`, `name` (e.g. "Souss-Massa"), `country`, `bounds`. Enables future expansion.
- **`spots`** — `id`, `region_id` (FK), `name`, `lat`, `lng` (or `geography(Point)` with PostGIS), `type` (enum: beach, rocks, port, river_mouth, pier), `description`, `created_at`.
- **`spot_photos`** — `id`, `spot_id` (FK), `url`, `position`.
- **`favorites`** — `user_id` (FK), `spot_id` (FK), composite PK.
- **`condition_snapshots`** — `id`, `spot_id` (FK), `captured_at`, `tide_height`, `tide_state`, `wind_speed`, `wind_dir`, `wave_height`, `weather` (jsonb), `source`. Stores fetched marine data.
- **`community_reports`** — `id`, `spot_id` (FK), `user_id` (FK), `catch_count`, `notes`, `rating`, `created_at`. Feeds the score engine.
- **`score_cache`** — optional: `spot_id`, `computed_at`, `score`, `factors` (jsonb) for performance.

**RLS policies:** public read on `spots`/`regions`/`spot_photos`; authenticated write on `favorites`/`community_reports`; users can only modify their own rows.

#### API Architecture

Use **Next.js Route Handlers** as a proxy layer so external API keys stay server-side and responses are normalized + cached in `condition_snapshots`:

- `GET /api/weather?spotId=` — fetches weather/wind/wave/tide, normalizes, persists snapshot.
- `GET /api/timeline?spotId=&date=` — returns forecast points **interpolated to 5-minute increments** (the timeline's data backbone).
- `POST /api/score` — runs the deterministic engine on a condition set, returns score (0–10) + factor breakdown + label.
- `POST /api/ai/recommend` — sends *only* structured marine data + score to Gemini, returns an interpretive sentence. Guardrails prevent data invention.

TanStack Query handles all client fetching, caching, and background revalidation.

---

#### Phased Implementation Plan

**Phase 1 — Foundation & Design System**
- Init Next.js 15 + TypeScript + Tailwind + Shadcn + Framer Motion.
- Build dark ocean theme tokens (colors, typography, spacing).
- Create base layout, skeleton loaders, premium card primitives.
- *Milestone:* runnable app with design system; no business logic.

**Phase 2 — Supabase & Auth**
- Create migrations for all tables above; enable RLS.
- Wire Supabase server/client; implement email + Google login.
- Protected actions and favorites scaffolding.
- *Milestone:* user can sign in; schema deployed.

**Phase 3 — Mapbox & Spots**
- Mapbox dark ocean style, custom markers, clustering, animations.
- Seed Souss-Massa spots only (Sidi R'bat, Tifnit, Douira, Massa, Sidi Boulfdail, Aglou).
- *Milestone:* map renders real local spots, mobile-friendly.

**Phase 4 — Spot Details Page**
- Hero image, conditions layout, community reports section (static data shells).
- *Milestone:* navigable spot page communicating good/bad at a glance.

**Phase 5 — Weather & Marine Data**
- Integrate weather/wind/wave/tide APIs via proxy routes; persist snapshots.
- Populate spot details with live data.
- *Milestone:* real marine data displayed and stored.

**Phase 6 — Fishing Score Engine**
- Deterministic, testable scoring from tide/wind/waves/weather/community/catches.
- 0–10 score, labels, factor breakdown UI.
- *Milestone:* reproducible scores with unit tests.

**Phase 7 — Marine Timeline (Flagship)**
- 5-minute scrubber with interpolation; synced tide/wind/wave/score updates.
- Tide curve, wind/wave/score charts; highlight best/good/moderate/poor windows.
- *Milestone:* the standout feature answering "when should I fish today?".
**Phase 8 — Gemini Integration**

- Prompt builder fed only by structured data + score; strict no-invention guardrails.
- AI recommendation on spot page and timeline.
- *Milestone:* contextual interpretive text, no hallucinated data.

**Phase 9 — Polish & Performance**

- Animation refinement, performance optimization, responsive QA, final review.
- *Milestone:* premium consumer-grade product ready.

**Phase 8 — Gemini Integration**

- Prompt builder fed only by structured data + score; strict no-invention guardrails.
- AI recommendation on spot page and timeline.
- *Milestone:* contextual interpretive text, no hallucinated data.

**Phase 9 — Polish & Performance**
- Animation refinement, performance optimization, responsive QA, final review.
- *Milestone:* premium consumer-grade product ready.

---

Recommended next step: track this as work items in the project. I can create an **epic** for FishCast V2 with one **issue per phase** (acceptance criteria included), or scaffold **Phase 1** when you're ready. Which would you like?