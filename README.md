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

- **Next.js 15** (App Router) + **React 19** (stable) + **TypeScript** (strict mode)
- **Tailwind CSS v4** (`@theme` directives in `app/globals.css`; no `tailwind.config.ts`)
- **Redux Toolkit** + **react-redux** for client-side state (App Router-safe `makeStore()` factory)
- **pg** (node-postgres) for the database
- **@serwist/next** for the installable PWA shell (service worker + manifest)
- Server Components for initial data fetch; Client Components for interactivity
- **Yarn Berry 4** (`nodeLinker: node-modules`) as the package manager
- **ESLint 9** flat config + **Prettier** + **Husky** + **lint-staged**

## Conventions

- All components are arrow-`const` exports (`export const Foo = (...) => ...`).
  Enforced via `func-style: ["error", "expression"]` in ESLint.
- Absolute imports via the `@/` alias only. `../` parent traversal is banned
  by `no-restricted-syntax`. Sibling `./` imports are fine.
- Client state lives in Redux Toolkit slices under `store/`. Use the typed
  hooks `useAppSelector` / `useAppDispatch` from `@/store/hooks`. Two slices:
  - `preferences` — slot config, current food, AI tags
  - `codes` — catalog hydrated from the server on mount
- DB access goes through `lib/queries.ts` — never instantiate pg connections
  in components or routes directly. `lib/db.ts` owns the Pool singleton
  (HMR-safe).

## Local setup

```bash
cd PersonalizedNutritionPWA
corepack enable                                                  # one-time: enables Yarn 4
cp .env.local.example .env.local                                 # then fill in DATABASE_URL
yarn install
psql "$DATABASE_URL" -f db/refresh_food_normalized_scores.sql    # see "Database setup" — required if the wide table doesn't exist yet
yarn dev
```

Open `http://localhost:3000`.

### VS Code / Cursor (per-environment debug)

Shared launch configs live in [`.vscode/launch.json`](./.vscode/launch.json).
Each environment uses its own gitignored env file:

| Environment | Env file (create from example) | Launch config                   |
| ----------- | ------------------------------ | ------------------------------- |
| Local       | `.env.local`                   | **PN PWA — Local: Next.js dev** |
| UAT         | `.env.uat.local`               | **PN PWA — UAT: Next.js dev**   |
| Prod        | `.env.prod.local`              | **PN PWA — Prod: Next.js dev**  |

```bash
cp .env.local.example .env.local
cp .env.uat.local.example .env.uat.local    # optional
cp .env.prod.local.example .env.prod.local  # optional
```

The dev configs set `envFile` before `yarn dev` starts so `DATABASE_URL` from
the selected file wins over values in `.env.local`, then attach Chrome when
the server is ready (server + client breakpoints). Use **PN PWA — \*: Chrome
(client)** if the dev server is already running.

Production-server variants (`yarn build && yarn start`) are included per env
for Serwist / production-only behavior.

If `DATABASE_URL` is missing or points at a host pg can't reach (e.g.
the template placeholders are still in `.env.local`), the app's
[`SetupErrorScreen`](./components/SetupErrorScreen.tsx) renders a friendly
guidance page instead of a stack trace — see
[`app/(app)/layout.tsx`](./app/%28app%29/layout.tsx).

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

| Trigger                                                      | Run the script?                             |
| ------------------------------------------------------------ | ------------------------------------------- |
| First time setting up the app against a database             | **Yes — required.**                         |
| New code added to `food_expressions`                         | Yes — new code → new column                 |
| Foods re-scored / `food_expression_foods` materially changed | Yes — refreshes stored values               |
| Just running the app day-to-day                              | No — the table is read-only at request time |

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

## PWA

The app ships as an installable PWA. The pieces:

- **Manifest** — typed route at [`app/manifest.ts`](./app/manifest.ts), served
  as `/manifest.webmanifest`.
- **Icons** — `public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png`.
- **Service worker** — source in [`app/sw.ts`](./app/sw.ts), bundled by
  `@serwist/next` to `public/sw.js` at build time. Uses Serwist's
  `defaultCache` (precache build assets, network-first for `/api/*`,
  stale-while-revalidate for images).
  Install-only — no offline data sync (no IndexedDB / background sync). To
  verify installability locally: `yarn build && yarn start`, then open Chrome
  DevTools → Application → Manifest.

## Project layout

```
.env.local                 — local DATABASE_URL + keys (gitignored)
.env.uat.local             — UAT (gitignored)
.env.prod.local            — prod (gitignored)
.env.local.example         — template
.env.uat.local.example     — UAT template
.env.prod.local.example    — prod template
.vscode/launch.json        — Run and Debug configs per environment
.yarnrc.yml                — Yarn Berry 4 config (nodeLinker: node-modules)
.husky/                    — git hooks (pre-commit runs lint-staged)
.prettierrc.json           — Prettier config
eslint.config.mjs          — ESLint 9 flat config (func-style + import rules)
db/
  refresh_food_normalized_scores.sql — wide-table maintenance script
                                       (idempotent, re-runnable; see
                                       "Database setup" above)
app/
  layout.tsx               — root layout (Metadata + Viewport for PWA)
  manifest.ts              — typed web app manifest
  sw.ts                    — Serwist service worker source (production build)
  sw.js/route.ts           — dev-only kill switch route handler
  globals.css              — Tailwind 4 @theme + utilities
  (app)/                   — routed PWA shell (single phone + bottom tabs)
    layout.tsx             — fetches codes catalog; catches DB errors
    error.tsx              — client error boundary (uses SetupErrorScreen)
    app-providers.tsx      — StoreProvider + CodesHydrator + SeedRunner
    page.tsx               — Preferences (Codes) tab
    browse/page.tsx        — Browse tab
    scan/page.tsx          — Scan tab
    food/[id]/page.tsx     — food detail page
  demo/
    page.tsx               — SSR codes catalog, hands off to ClientStage
    client-stage.tsx       — 3-phone side-by-side stage for stakeholder demos
  api/
    codes/route.ts         — GET  → SelectableExpression[]
    browse/route.ts        — POST → BrowsePage (paged composite-sorted list)
    food/by-id/[id]/route.ts   — GET → ScoredFood
    food/by-upc/[upc]/route.ts — GET → ScoredFood
    code/compose/route.ts  — POST → AI-composed starter slot config
    code/tags/route.ts     — POST → AI-generated descriptive tags
lib/
  db.ts                    — pg Pool singleton (HMR-safe) + DatabaseNotConfigured /
                             DatabaseUnreachable error classes
  types.ts                 — domain types (Slot, ScoredFood, BrowseFood, …)
  queries.ts               — the four data queries
  category-map.ts          — code slug → picker category
  code-identity.ts         — code → display identity (icon, accent, tier color)
  code-prompts.ts          — system + user prompts for the AI compose/tag flows
  llm.ts                   — provider-agnostic LLM gateway (OpenAI / Anthropic)
  composite.ts             — pure helpers: composite math, weight rebalance,
                             auto-equalize
store/                     — Redux Toolkit
  index.ts                 — makeStore() factory + RootState / AppDispatch types
  hooks.ts                 — typed useAppSelector / useAppDispatch / useAppStore
  store-provider.tsx       — "use client" Provider w/ useRef store + storage hydration
  selectors.ts             — memoized composite / filled / signature / stale selectors
  preferences-hooks.ts     — back-compat hook layer (usePreferences, etc.)
  codes-hydrator.tsx       — bridges server-fetched codes into the store
  api-urls.ts              — shared expressionId query-string builder
  slices/
    preferences-slice.ts   — slot config + current food + AI tags
    codes-slice.ts         — selectable expressions catalog
  middleware/
    persistence.ts         — listener middleware (localStorage write + restore)
components/
  SetupErrorScreen.tsx     — friendly DB-not-configured / -unreachable screen
  PhoneFrame.tsx           — iPhone-shaped bezel (demo stage)
  RoutedPhoneShell.tsx     — single-phone bezel for the routed PWA
  BottomTabBar.tsx         — three-tab dock at the bottom of the routed shell
  PreferencesPhone.tsx     — Preferences tab — slots + picker modal
  SlotCard.tsx             — one slot row
  CodePickerModal.tsx      — code picker, grouped by category
  BrowsePhone.tsx          — Browse tab — ranked food list with debounced refresh
  ProductPhone.tsx         — Scan tab — UPC lookup + scored detail card
  ScoredFoodCard.tsx       — scored breakdown card (used on /food/[id])
  ScoreRing.tsx            — composite ring (conic gradient + mask)
  AIHero.tsx               — Talk-to-AI empty hero + tag row + stale-tags button
  TalkToAISheet.tsx        — bottom sheet for the compose-by-AI flow
  BarcodeScanner.tsx       — @zxing/browser camera scanner
  Icon.tsx                 — inline-SVG icon set (lucide subset)
public/
  icons/                   — PWA icons (192, 512, maskable-512, apple-touch-icon)
  sw.js                    — service worker (generated by Serwist at build; gitignored)
```

## Scripts

- `yarn dev` — start the dev server
- `yarn build` — production build (TypeScript check + bundle + service worker)
- `yarn start` — start the production server (after build)
- `yarn lint` — ESLint flat config
- `yarn typecheck` — TS strict pass without emitting
- `yarn format` — Prettier write across the repo
- `yarn format:check` — Prettier check without writing (useful in CI)

The `pre-commit` hook (Husky) runs `lint-staged`, which runs `eslint --fix`

- `prettier --write` on staged `.ts` / `.tsx` files and `prettier --write` on
  staged `.json` / `.md` / `.css` / `.yml` / `.yaml` files.

## What's intentionally NOT here yet

- **Authentication** — `[AllowAnonymous]` equivalent; no Auth.js or similar.
- **Tests** — foundation only. Add Vitest / React Testing Library / Playwright
  when the surface stabilizes.
- **Offline data sync** — the PWA is installable but does not cache API
  responses or persist user-generated data beyond `localStorage`. No
  IndexedDB / background sync wiring.
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
