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
* Mapbox
* Gemini API
* TanStack Query

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
* Massa
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

### Authentication

* Email login
* Google login
* Protected actions
* Favorite spots

---

### Interactive Map

Use Mapbox.

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
* Weather
* Tide
* Wind
* Waves
* Fishing score
* AI recommendation
* Community reports

The page must instantly communicate whether fishing conditions are good or bad.

---

### Weather & Marine Data

Integrate APIs for:

* Weather
* Wind
* Waves
* Tide

Store snapshots in Supabase.

---

### Fishing Score Engine

Generate a deterministic score from:

* Tide
* Wind
* Waves
* Weather
* Community activity
* Recent catches

Score:

0–10

Labels:

* Excellent
* Good
* Moderate
* Poor

Display factor breakdowns.

---

## Flagship Feature: Marine Timeline

This is the most important feature in FishCast.

Inspired by Nautide.

Requirements:

* Timeline scrubbing
* 5-minute increments
* Smooth animations
* Mobile-first interaction

As the user moves through time:

* Tide updates
* Tide height updates
* Wind updates
* Waves update
* Weather updates
* Fishing score updates
* AI recommendation updates

Use interpolation between forecast points.

Do not require true 5-minute forecast APIs.

Display:

* Tide curve
* Wind chart
* Wave chart
* Fishing score chart

Highlight:

* Best fishing windows
* Good periods
* Moderate periods
* Poor periods

The user should immediately understand:

"When is the best time to fish today?"

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
* Authentication

Phase 3

* Mapbox integration
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

* Build authentication.
* Build Supabase schema.
* Build Mapbox integration.
* Build weather services.
* Build marine timeline.
* Build scoring engine.

One feature at a time.

Every feature must be complete, runnable, and tested before moving to the next one.
