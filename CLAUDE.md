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

## Local development

- `npm run dev` — Next.js dev server on http://localhost:3000
- `npm run build` — production build (TypeScript check + bundle)
- `npm run typecheck` — TS strict pass without emit
- `npm run lint` — ESLint via next/lint

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
- DB access goes through `lib/queries.ts` — never instantiate pg
  connections in components or routes directly. `lib/db.ts` owns the
  Pool singleton (HMR-safe).
- Types live in `lib/types.ts`. Domain types are camelCase; DB row
  shapes are local to `lib/queries.ts` in snake_case.
- Pure helpers (composite math, weight rebalance) live in
  `lib/composite.ts` — no React dependencies, easy to test, easy to
  port to a future React Native client.
