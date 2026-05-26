# Claude Code Project Guidelines — PersonalizedNutritionPWA

## Git Commits

- **NEVER include AI attribution in commits, PRs, or any git artifact.**
  No `Co-Authored-By: Claude`, no `Generated with Claude Code`, no
  Anthropic / Claude / AI references in any form, ever. The author and
  committer fields, the message body, and the trailer must all reflect a
  human identity only.
- Write detailed commit messages describing the changes — what changed,
  why, and any non-obvious decisions. Title in imperative mood; body
  with full context.

## Git Branches

- NEVER delete feature branches — they stay forever as a reference for
  the detailed commits and history.

## Package manager

- Yarn Berry 4 (`nodeLinker: node-modules`). Use `yarn`, not `npm`.
- Lockfile is `yarn.lock`. The Yarn version is pinned via
  `"packageManager": "yarn@4.5.0"` in `package.json` and provisioned by
  Corepack — run `corepack enable` once, then `yarn install`. No release
  binary is checked in under `.yarn/releases/`.

## Local development

- `yarn dev` — Next.js dev server on http://localhost:3000
- `yarn build` — production build (TypeScript check + bundle + service worker)
- `yarn typecheck` — TS strict pass without emit
- `yarn lint` — ESLint flat config
- `yarn format` — Prettier write across the repo

### "Run the app" — preferred entrypoint

When a user (or future Claude session) asks to "run the app", the path of
least friction is `corepack enable && corepack yarn install && corepack
yarn dev`. The dev server binds http://localhost:3000.

If `.env.local` doesn't exist and `DATABASE_URL` isn't otherwise in the
environment, the app auto-enters **mock mode** (see below) — boots with
captured fixtures, no Postgres needed. No setup question to ask the user;
just start the server.

## Mock mode

- The data layer (`lib/queries.ts`) and AI route handlers
  (`app/api/code/{compose,tags}/route.ts`) gate on `isMockMode()` from
  `lib/mock-mode.ts`.
- Mock mode is **on** when `PN_MOCK_DATA=1` OR when `DATABASE_URL` is unset.
  Mock mode is **off** when `PN_MOCK_DATA=0` OR when `DATABASE_URL` is set.
- Fixtures live in `lib/mock-data/`:
  - `expressions.json` — 40 curated codes (same as the real catalog).
  - `foods.json` — 400 foods spanning the score distribution, each with
    full per-expression `SlotScore` maps so browse re-sorts live as the
    user adjusts slot weights.
  - `upcs.json` — 183 real UPCs → foodId, so the scan flow resolves for
    any of those barcodes.
  - `llm.ts` — keyword-matched compose response + canned tags response.
- Regenerate fixtures with `scripts/capture-mock-data.sh` after pulling
  fresh DB data. Requires a live DB and a running prod server.
- Mock mode is intended for fresh-clone "see the app work" demos and for
  smoke tests. It is **not** intended to mirror prod data — fixtures
  drift; assume they're stale.

## Secrets

- `DATABASE_URL` lives in `.env.local` (gitignored). Template is
  `.env.local.example`. Mirrors the WISEintelligence repo's
  `ConnectionStrings:DefaultConnection` user secret. Update both when
  credentials rotate.
- The app falls back to mock mode without it (see above), so setting
  `DATABASE_URL` is only needed when running against the real DB.

## Design doc

- Full design rationale, scoring math, performance journey, and the
  implementation map between this repo and the Blazor prototype is in
  `PROTOTYPE.md`. Read it before making architecture changes.

## Stack conventions

- App Router only (`app/`). No `pages/`.
- Server Components by default; `"use client"` only where needed.
- All components are arrow-`const` exports
  (`export const Foo = (...) => ...`). Enforced via `func-style` in
  ESLint.
- Client state lives in Redux Toolkit slices under `store/`. Use the
  `useAppSelector`/`useAppDispatch` typed hooks (`store/hooks.ts`).
  The two slices are `preferences` (slot config, current food, AI tags)
  and `codes` (catalog hydrated from the server on mount).
- DB access goes through `lib/queries.ts` — never instantiate pg
  connections in components or routes directly. `lib/db.ts` owns the
  Pool singleton (HMR-safe).
- Types live in `lib/types.ts`. Domain types are camelCase; DB row
  shapes are local to `lib/queries.ts` in snake_case.
- Pure helpers (composite math, weight rebalance) live in
  `lib/composite.ts` — no React dependencies, easy to test, easy to
  port to a future React Native client.
- Absolute imports via the `@/` alias only — `../` parent traversal is
  banned via `no-restricted-syntax`. Sibling `./` imports are fine.

## PWA

- Manifest is a typed route at `app/manifest.ts` (served as
  `/manifest.webmanifest`).
- Service worker source is `app/sw.ts`, bundled to `public/sw.js` by
  `@serwist/next` at build time. Disabled in dev to play nice with HMR.
- Installable shell only — no offline data sync. Caching strategy is
  Serwist's `defaultCache` (precache + SWR for images, network-first
  for API).
