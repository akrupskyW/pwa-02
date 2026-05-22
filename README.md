# Personalized Nutrition PWA

A Next.js + TypeScript foundation for the consumer-facing personalized
nutrition experience. Pick up to five WISEcode codes that matter to you,
weight them, and see how any food in the corpus scores against your
personal definition of good food.

Forked architecturally from the WISEintelligence Blazor prototype at
`/pwa` — same data model, same scoring math, rebuilt on a production-aligned
stack so it can grow without being constrained by the host app.

See **[PROTOTYPE.md](./PROTOTYPE.md)** for the full design rationale, the
data architecture, the journey from naive Postgres CTE to the wide-table
denormalization, and the consumer-scale considerations that informed
this stack choice.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **pg** (node-postgres) for the database
- Server Components for initial data fetch; Client Components for interactivity
- Context + useReducer for client-side state; no third-party state library

## Local setup

```bash
cd PersonalizedNutritionPWA
cp .env.local.example .env.local      # then fill in DATABASE_URL
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required schema access

The connecting Postgres user needs SELECT on:

- `wisecode_app.food_expressions`
- `wisecode_app.food_expression_foods`
- `wisecode_app.food_expression_value_interpretations`
- `wisecode_app.food_normalized_scores` — the denormalized wide table; created
  and maintained by the WISEintelligence refresh script (see PROTOTYPE.md)
- `wisecode_gold.food`
- `wisecode_gold.product`

If `wisecode_app.food_normalized_scores` doesn't exist yet, run the refresh
script from the WISEintelligence repo at
`WISEcode.Services/Sql/FoodNormalizedScores/refresh_food_normalized_scores.sql`.

## Project layout

```
.env.local                 — DATABASE_URL (gitignored)
.env.local.example         — template
app/
  layout.tsx               — root layout
  page.tsx                 — SSR codes catalog, hands off to ClientStage
  client-stage.tsx         — 3-phone stage with the preferences provider
  globals.css              — Tailwind + a few resets
  api/
    codes/route.ts         — GET  → SelectableExpression[]
    browse/route.ts        — POST → BrowsePage (paged composite-sorted list)
    food/by-id/[id]/route.ts   — GET → ScoredFood
    food/by-upc/[upc]/route.ts — GET → ScoredFood
lib/
  db.ts                    — pg Pool singleton (HMR-safe), query() helper
  types.ts                 — domain types (Slot, ScoredFood, BrowseFood, …)
  queries.ts               — the four data queries
  category-map.ts          — code slug → picker category
  composite.ts             — pure helpers: composite math, weight rebalance,
                             auto-equalize
state/
  preferences-context.tsx  — Context + reducer, localStorage hydration
components/
  PhoneFrame.tsx           — iPhone-shaped bezel
  PreferencesPhone.tsx     — left phone — slots + picker modal
  SlotCard.tsx             — one slot row
  CodePickerModal.tsx      — code picker, grouped by category
  BrowsePhone.tsx          — middle phone — ranked food list with debounced refresh
  ProductPhone.tsx         — right phone — UPC lookup + scored detail card
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — start the production server (after build)
- `npm run lint` — Next/ESLint
- `npm run typecheck` — TS strict pass without emitting

## What's intentionally NOT here yet

- **Authentication** — `[AllowAnonymous]` equivalent; no Auth.js or similar.
- **Tests** — foundation only. Add Vitest / Playwright when the surface stabilizes.
- **Analytics, error reporting, CSP, rate limiting** — production add-ons that
  belong on top of this foundation, not in it.

## Barcode scanning

The Scan phone supports live camera scanning via `@zxing/browser`. The scanner
chunk is dynamic-imported so the ~250KB library only loads when the user taps
"Scan barcode" — the initial page bundle stays under 7KB.

Constraints / behavior:

- Requests the rear (environment-facing) camera via `facingMode: { ideal: "environment" }`
- Accepts UPC-A (12 digits) and EAN-13 (13 digits); other 1D/2D formats decoded
  by zxing are filtered out at the UI layer
- Falls back gracefully on permission denial, missing camera, or non-HTTPS
  origins — the user can always type the UPC into the field
- Camera + decoder are stopped cleanly on Cancel and on component unmount
- `getUserMedia` requires HTTPS in production; `localhost` is exempt for dev
