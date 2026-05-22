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
psql "$DATABASE_URL" -f db/refresh_food_normalized_scores.sql   # see "Database setup" — required if the wide table doesn't exist yet
npm run dev
```

Open `http://localhost:3000`.

The `psql` step is only needed the first time you point at a database, or
when codes / source scores change. See **Database setup** below.

## Required schema access

The connecting Postgres user needs SELECT on:

- `wisecode_app.food_expressions`
- `wisecode_app.food_expression_foods`
- `wisecode_app.food_expression_value_interpretations`
- `wisecode_app.food_normalized_scores` — **the denormalized wide table this
  app's Browse phone depends on. Created and refreshed by the SQL script in
  `db/` (see "Database setup" below).**
- `wisecode_gold.food`
- `wisecode_gold.product`

## Database setup

> **Required.** Without `wisecode_app.food_normalized_scores`, the Browse phone
> can't sort foods by composite weighted score and will fail at runtime.

The Browse phone's sub-second list query relies on a denormalized wide table
`wisecode_app.food_normalized_scores` (one row per food, one REAL column per
food expression code). This avoids the 20-second CTE-and-GROUP-BY hit that
the naive query against `wisecode_app.food_expression_foods` would have.
See [PROTOTYPE.md §5 — Performance journey](./PROTOTYPE.md) for the rationale.

The maintenance script lives at:

```
db/refresh_food_normalized_scores.sql
```

It's idempotent and re-runnable. Running it:

- Creates `wisecode_app.food_normalized_scores` if missing
- Adds a column for each code in `wisecode_app.food_expressions` that doesn't
  already have one (`ALTER TABLE ADD COLUMN IF NOT EXISTS`)
- Removes rows for foods that lost `fully_parsed`; adds rows for newly
  `fully_parsed` foods
- For each code, refreshes the column values from `food_expression_foods`,
  writing only the rows whose stored value actually changed
  (`IS DISTINCT FROM` guard). Per-cell values are clamped to `[0, 100]`.

When to run it:

| Trigger | Run the script? |
|---|---|
| First time setting up the app against a database | **Yes — required.** |
| New code added to `food_expressions` | Yes — new code → new column |
| Foods re-scored / `food_expression_foods` materially changed | Yes — refreshes stored values |
| Just running the app day-to-day | No — the table is read-only at request time |

How to run it (psql):

```bash
psql "$DATABASE_URL" -f db/refresh_food_normalized_scores.sql
```

Expect ~6 minutes on a ~1M-foods × ~50-codes corpus for a cold first run;
subsequent re-runs that find most cells already at the right value finish
faster.

The script is also tracked in the WISEintelligence repo at
`WISEcode.Services/Sql/FoodNormalizedScores/refresh_food_normalized_scores.sql`
where it's the canonical source. If the two ever drift, sync from
WISEintelligence to here, not the other way around.

## Project layout

```
.env.local                 — DATABASE_URL (gitignored)
.env.local.example         — template
db/
  refresh_food_normalized_scores.sql — wide-table maintenance script
                                       (idempotent, re-runnable; see
                                       "Database setup" above)
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
