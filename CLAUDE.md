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
- Lockfile is `yarn.lock`. The Yarn release binary is checked in under
  `.yarn/releases/` via Corepack.

## Local development

- `yarn dev` — Next.js dev server on http://localhost:3000
- `yarn build` — production build (TypeScript check + bundle + service worker)
- `yarn typecheck` — TS strict pass without emit
- `yarn lint` — ESLint flat config
- `yarn format` — Prettier write across the repo

## Secrets

- `DATABASE_URL` lives in `.env.local` (gitignored). Template is
  `.env.local.example`. Mirrors the WISEintelligence repo's
  `ConnectionStrings:DefaultConnection` user secret. Update both when
  credentials rotate.

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
