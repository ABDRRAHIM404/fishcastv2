# FishCast V2 - Development Instructions

## Project Goal

Build FishCast as a professional fishing intelligence platform focused initially on Chtouka Aït Baha and Souss-Massa, Morocco.

The goal is to help fishermen answer:

"Should I go fishing now, and where is the best spot?"

This is a real product, not a demo, portfolio project, or school project.

---

## Tech Stack

* Next.js 15
* TypeScript
* Tailwind CSS
* Framer Motion
* Shadcn UI
* Supabase
* Leaflet + OpenStreetMap
* Gemini API

---

## Development Rules

Build one feature at a time.

Never generate the whole application at once.

After every feature:

```bash
npm run build
```

If the build fails, fix it before moving on.

Commit after every working feature:

```bash
git add .
git commit -m "feat: feature-name"
```

---

## Region Focus

FishCast V1 only covers:

* Sidi R'bat
* Tifnit
* Douira
* Am9erss (stored as `massa` in the existing database)
* Sidi Boulfdail
* Aglou

No international seed data.

No Portugal, USA, Australia, or random demo locations.

The platform must be designed to expand later.

---

## Design Standards

Target quality:

* Premium
* Modern
* Professional
* Mobile-first

Requirements:

* Beautiful typography
* Smooth animations
* Framer Motion transitions
* Skeleton loaders
* Premium cards
* Dark ocean-inspired theme
* Consistent spacing
* Responsive layouts
* High-end UX

Avoid:

* Generic dashboards
* Template-looking UI
* Admin-panel aesthetics

The app should feel like a premium consumer product.

---

## Core Features

### Public access

* No login, signup, account, or protected pages
* Fishing information is available immediately
* Favorite spots are stored locally on the current device
* Clearing browser storage removes local favorites

---

### Interactive Map

Use Leaflet with OpenStreetMap tiles.

Requirements:

* Dark ocean theme
* Custom fishing markers
* Smooth marker animations
* Spot clustering support
* Mobile-friendly interactions

Display local fishing spots on the map.

---

### Fishing Spots

Each spot contains:

* Name
* Coordinates
* Photos
* Description
* Spot type
* Conditions
* Fishing score

Spot types:

* Beach
* Rocks
* Port
* River Mouth
* Pier

---

### Spot Details Page

Display:

* Hero image
* Decision-first seven-day fishing forecast
* 30-minute, 1-hour, 3-hour and 6-hour views
* Detailed table, categorized graphs and selected-day timeline
* Weather, modelled tide, wind, waves and currents
* Fishing quality and a separate conservative safety assessment
* Ranked fishing windows and matched in-season species
* AI recommendation

The page must instantly communicate whether fishing conditions are good or bad.

---

### Weather & Marine Data

Current providers:

* Open-Meteo Forecast for weather and wind
* Open-Meteo Marine for waves, swell, and modelled sea-level tide estimates

Store snapshots in Supabase.

Tide heights, trends, and high/low events are estimates derived from hourly
`sea_level_height_msl` values. They are relative to modelled mean sea level,
are not official nautical tide predictions, and must not be used for
navigation or other safety-critical decisions.

---

### Fishing Score Engine

Generate a deterministic score from:

* Tide
* Wind
* Waves
* Weather
* Pressure
* Moon phase
* Time of day

Score:

0–10

Labels:

* Excellent
* Good
* Moderate
* Poor

Display factor breakdowns.

---

## Flagship Feature: Seven-day Forecast

This is the most important feature in FishCast.

The spot page uses one compact `GET /api/forecast` response for all seven days
and all display intervals. A six-spot comparison is fetched separately and only
when requested. Provider calls and service-role cache access remain server-only.

Requirements:

* Windguru-inspired dense table with plain-language labels
* Seven selectable local days in `Africa/Casablanca`
* Device-local interval and view preferences
* Shareable date, interval, view and scope URL state
* Horizontally scrollable mobile table with sticky parameter names
* Accessible 30-minute timeline backed by the internal 5-minute model

As the user moves through time:

* Tide updates
* Tide height updates
* Wind updates
* Waves update
* Weather updates
* Fishing score updates
* AI recommendation updates

The internal timeline uses interpolation between forecast points. Thirty-minute
display rows may therefore be estimated, hourly rows prefer native provider
timestamps, and 3-hour/6-hour rows are explicitly labelled aggregates. Safety
uses the worst underlying five-minute state in every display interval, so a
brief Dangerous period cannot disappear inside an average.

Do not require true 5-minute forecast APIs.

Display modes:

* Detailed forecast table
* Fishing, safety, wind, wave, tide and weather graph categories
* Selected-day scrubber and complete condition readout

Highlight:

* Best fishing windows
* Good periods
* Moderate periods
* Poor periods

The user should immediately understand:

"Should I fish, when is the best window, and what conditions require caution?"

Fishing quality never overrides safety. Modelled tide and derived wave metrics
are estimates, and the onshore/offshore interpretation uses unverified editorial
spot orientation. See [Forecast methodology](docs/forecast-methodology.md).

This should be one of the most impressive parts of the application.

---

## Gemini Rules

Gemini never invents data.

Gemini only interprets:

* Tide data
* Wind data
* Wave data
* Weather data
* Fishing score

Example:

"Conditions are favorable because the tide is rising and winds remain moderate."

---

## Development Order

Phase 1

* Next.js setup
* Folder structure
* Design system

Phase 2

* Supabase
* Database schema
* Anonymous public reference-data reads

Phase 3

* Leaflet/OpenStreetMap integration
* Fishing spots
* Local seed data

Phase 4

* Spot details page

Phase 5

* Weather APIs
* Tide APIs

Phase 6

* Fishing score engine

Phase 7

* Marine timeline

Phase 8

* Gemini integration

Phase 9

* UI polish
* Performance optimization
* Final review

---

"Build the entire application."

Instead ask:

* Build Supabase schema.
* Build Leaflet/OpenStreetMap integration.
* Build weather services.
* Build marine timeline.
* Build scoring engine.

One feature at a time.

Every feature must be complete, runnable, and tested before moving to the next one.
