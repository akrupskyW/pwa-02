# Personalized Nutrition — Prototype Design Doc

This document captures the full design rationale behind the personalized
nutrition consumer experience, including:

1. What it does and why
2. The 3-screen UX model
3. Database architecture (tables, schemas, the `food_normalized_scores`
   denormalization, refresh script)
4. The scoring math (composite weighted average, missing-score policy,
   confidence-adjusted sort)
5. The performance journey from naive Postgres CTE → MotherDuck consideration
   → wide-table denormalization
6. Consumer-scale architecture (why the current stack is right for a foundation,
   not necessarily right for 10K+ concurrent traffic — and what changes when
   that day comes)
7. Implementation map — how the WISEintelligence prototype's structure maps
   onto this Next.js repo

It is intentionally exhaustive. A new contributor should be able to read this
top to bottom and understand both the _what_ and the _why_ without needing
to dig into the source first.

---

## 1. What it does

The consumer picks **up to five food expression "codes"** that matter to
them — `heart_healthy`, `clean_label`, `wisecode_upf`, `gluten_free`,
`high_protein`, etc. — and assigns each a **weight** out of 100. The weights
of the filled slots always sum to exactly 100.

The app then shows the consumer:

- **A live ranked list of foods** in the WISEcode corpus, sorted by their
  weighted composite score against the consumer's slot config. Top result
  is the food that best satisfies the consumer's personal definition of
  "good food."
- **A per-food breakdown** when the consumer scans a UPC (or clicks a row
  in the Browse list): the composite, plus a row per selected code showing
  that code's individual score, the interpretive label (e.g.,
  "Heart Healthy: Good"), color badge, and weighted contribution.

When the consumer drags a weight slider, the list and the breakdown
re-sort and re-score live (with a short debounce so a slider drag doesn't
fire hundreds of queries).

### Why this matters

Existing food-rating UX (Nutri-Score, Guiding Stars, NOVA, etc.) is
**single-perspective**. One universal scoring rubric, one number per food,
zero acknowledgment that consumers prioritize different things. A person
managing heart disease, a person avoiding ultra-processed food, and a
person looking for low-sugar high-protein foods all see the same number
on the same product — and that number was decided by a committee that
doesn't share any of their priorities.

The personalized-nutrition idea: **the consumer brings the rubric.** The
platform brings the data and the math. The score is meaningful because it
was assembled out of _this consumer's_ choices.

---

## 2. UX model — three side-by-side phones on a dark stage

The screen is laid out as three iPhone-shaped frames on a dark stage so a
viewer can see all the moving parts at once. The same layout shipped in
the WISEintelligence Blazor prototype and is reproduced here.

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 1 · Define your │  │ 2 · Browse foods│  │ 3 · Scan a      │
│     code        │  │                 │  │    product      │
│                 │  │ ┌─────────────┐ │  │                 │
│ [ Heart Healthy │  │ │ 🍞 Bread A  │ │  │  📷 ▢ UPC field │
│   ▔▔▔▔▔▔▔  40% │  │ │           97│ │  │                 │
│ [ Clean Label   │  │ │ 🥫 Soup B   │ │  │ ─────────────── │
│   ▔▔▔▔  30%     │  │ │           95│ │  │  Your score: 84 │
│ [ WISEcode UPF  │  │ │ 🧀 Cheese C │ │  │  ─ Heart Healthy│
│   ▔▔▔▔  30%     │  │ │           94│ │  │   85 × 40% = 34│
│ [ ＋ Add code  ] │  │ │     …       │ │  │  ─ Clean Label  │
│                 │  │ │ (scroll)    │ │  │   78 × 30% = 23│
└─────────────────┘  │ └─────────────┘ │  └─────────────────┘
                     └─────────────────┘
```

**Why three phones, not three pages:** the experience is a feedback loop.
Drag a slider on phone 1 → the ranking on phone 2 reshuffles instantly →
the breakdown on phone 3 (if a food is loaded) re-scores. Showing them
together makes the feedback loop the protagonist of the UI.

### Phone 1 — Preferences

- Up to 5 slot cards. Each filled slot shows the code name, a 0-100 weight
  slider, and a ✕ to remove.
- Empty slots show "＋ Add a code" — tapping opens a modal grouped by
  category (Diet & Lifestyle, Health Goals, Clean Eating, etc.).
- Codes already in another slot appear in the picker but are disabled.
- **Auto-equalize** when adding/removing: e.g. adding a 3rd code to a
  2-slot config (each at 50) snaps all three to 33/33/34.
- **Proportional rebalance** when dragging a slider: the delta is taken
  from (or given to) the other filled slots in proportion to their
  current weights, so the visible integers always sum to exactly 100.
  Edge case: if all others are at 0 and the user _decreases_ this slot,
  the freed weight splits evenly across the other filled slots.

### Phone 2 — Browse

- Virtualized infinite-scroll list of foods ranked by composite weighted
  score against the current slot config.
- Debounced refresh (400 ms) when slots change, with a "Loading Data"
  spinner in the header during the refresh window.
- Each row shows thumbnail, name, brand, composite (display capped at 100).
- Clicking a row loads the food into phone 3.

### Phone 3 — Scan / Detail

- "Scan barcode" button opens a camera overlay (`@zxing/browser`, lazy-loaded).
  Prefers the rear camera; accepts UPC-A / EAN-13; degrades to text input
  on permission denial or missing camera.
- UPC text input below the scanner button — typing one in works identically.
- When a food is loaded: product card (image / name / brand), the
  composite headline number (0-100), and a per-code breakdown with the
  label/color badge and a sub-line like `85 × 40% = 34.0` showing the
  math behind the headline integer.
- Persists the last viewed food in `localStorage` so a reload restores it.

---

## 3. Database architecture

### Source tables (live, transactional)

All under `wisecode_app` and `wisecode_gold` schemas in the WISEcode
Postgres instance.

| Table                                                | What it holds                                                                                                                                                    |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wisecode_gold.food`                                 | One row per food (id UUID, name, brand, product_image_url, **fully_parsed** boolean, …). ~2M rows; ~1M `fully_parsed = true`.                                    |
| `wisecode_gold.product`                              | One row per UPC; `food_id` FK → food. UPCs live in a `text[]` column on this table.                                                                              |
| `wisecode_app.food_expressions`                      | Catalog of codes (id UUID, code slug, name, active, render_type, …). ~50-100 codes.                                                                              |
| `wisecode_app.food_expression_foods`                 | Normalized per-(food, code) score. `(food_expression_id, food_id)` PK, plus `normalized_score numeric`, `food_expression_value_interpretation_id` FK. ~67M rows. |
| `wisecode_app.food_expression_value_interpretations` | Per-(code, score-bucket) interpretation metadata: label ("Good", "Excellent"), color (hex), sentiment.                                                           |

### The derived denormalization — `wisecode_app.food_normalized_scores`

A real maintained table created and refreshed by a PL/pgSQL script,
checked in at `db/refresh_food_normalized_scores.sql` in **this repo**
(also tracked in WISEintelligence at
`WISEcode.Services/Sql/FoodNormalizedScores/refresh_food_normalized_scores.sql`
as the canonical source — sync from there to here if they ever drift).
It's the wide-format counterpart of `food_expression_foods`:

```
food_id          UUID    PK, FK → food.id ON DELETE CASCADE
heart_healthy    REAL    ← column name = food_expressions.code
clean_label      REAL
wisecode_upf     REAL
… (one REAL column per code in food_expressions)
```

**Membership rule:** every food with `fully_parsed = TRUE` gets a row.
Non-fully-parsed foods are excluded entirely. Score columns are NULL
for foods that don't yet have a score for that code.

**Per-cell clamp:** values are clamped to [0, 100] at refresh time. Some
upstream `normalized_score` values were observed at 100.4-100.7
(scoring-algorithm artifact); without the clamp, those propagated
through weighted averages and produced composites of 101/102.

**Re-runnable contract:** the script is idempotent. Re-running it:

- Adds columns for any new codes since the last run (`ALTER TABLE ADD COLUMN IF NOT EXISTS`)
- Removes rows for foods that lost `fully_parsed`
- Adds rows for newly `fully_parsed` foods
- For each code, refreshes the column's values via two UPDATEs:
  - **3a.** NULL stale cells (foods whose `food_expression_foods` row was
    deleted)
  - **3b.** Set/refresh values from `food_expression_foods`, clamping and
    using `IS DISTINCT FROM` to skip unchanged cells

The earlier version used one self-joining UPDATE driven from
`food_normalized_scores LEFT JOIN food_expression_foods`. That worked but
forced a scan of `food_normalized_scores` twice per code (once in the
subquery driver, once in the outer join), turning a refresh into a 1+ hour
operation. Splitting into 3a/3b dropped that to ~6 minutes on a ~932K-row
foods × ~50-code workload.

---

## 4. Scoring math

### Composite

For each food being scored against the consumer's slot config:

```
composite = SUM(score_i × weight_i) / SUM(weight_i where score_i is not null)
```

- `score_i` ∈ [0, 100] is the food's score on slot i's code
- `weight_i` is the slot's weight (sums to 100 across filled slots)
- The denominator only includes weights for slots that _have_ a score on
  the food — see "missing-score policy" below
- The whole expression is computed in REAL/decimal precision and rounded
  to an integer at display time

### Missing-score policy (option a — re-normalize)

If a consumer selected `heart_healthy` and `clean_label` (each 50%) but
the food only has a `heart_healthy` score:

- Numerator: `score_heart × 50` only
- Denominator: `50` only
- Composite: `score_heart` (1.0, not 0.5)

The food is not penalized for missing `clean_label` data. It's averaged
across whatever it DOES have. The alternative (treating missing as 0)
unfairly tanks foods that just haven't been scored on every code yet.

### Display cap at 100

Even with refresh-time clamping, the UI also applies `Math.min(100, …)`
defensively. Belt-and-suspenders — costs nothing.

### Confidence-adjusted sort (browse list only)

The browse list sorts by:

1. `composite DESC NULLS LAST` (primary)
2. `present_count DESC` (number of slots that contributed to the
   denominator)
3. `food_id ASC` (paging stability)

So among the 100s, foods that hit all 5 slots beat foods that hit only 2.
The displayed score stays at 100 — only the ranking shifts. This captures
the intuition that a 100 backed by more contributing codes is a "more
trustworthy 100."

---

## 5. Performance journey — why a wide table

### Attempt 1 — the obvious CTE

```sql
WITH slots AS (
    SELECT unnest($1::uuid[]) AS food_expression_id,
           unnest($2::int[])  AS weight
),
scored AS (
    SELECT  fef.food_id,
            SUM(fef.normalized_score * s.weight) AS weighted_sum,
            SUM(s.weight)                        AS total_weight
    FROM    wisecode_app.food_expression_foods fef
    INNER JOIN slots s ON s.food_expression_id = fef.food_expression_id
    GROUP BY fef.food_id
    HAVING  SUM(s.weight) > 0
)
SELECT f.id, f.name, f.brand, f.product_image_url,
       ROUND(s.weighted_sum / s.total_weight)::int AS composite
FROM   scored s
INNER JOIN wisecode_gold.food f ON f.id = s.food_id
ORDER BY composite DESC NULLS LAST, f.name ASC
LIMIT 20 OFFSET 0
```

On the WISEcode dataset (~67M `food_expression_foods` rows, ~1M foods):
**~20 seconds per browse page.** EXPLAIN ANALYZE revealed a seq scan +
HashAggregate-with-disk-spill. Indexes help but can't fix the fundamental
shape: GROUP BY 1M food_ids over 67M score rows is expensive no matter how
you cut it.

### Attempt 2 — MotherDuck (considered, not chosen for consumer scale)

Same query against MotherDuck's column-store ran in <300 ms for the same
data. Real signal: the workload is analytical. Column-store + vectorized
aggregation eats this query for breakfast.

BUT: MotherDuck is priced and architected for analytical concurrency
(small concurrent user counts, large compute per query). For a consumer
app at 10K+ concurrent reads, the economics and latency tail don't fit.

So MotherDuck is the right backend for the **enterprise side** (≤1000
internal/BI users), not the consumer side. The consumer side needs a
different shape.

### Attempt 3 — denormalized wide table (chosen)

Reshape the data so the question becomes simple:

```sql
SELECT food_id,
       ROUND((COALESCE(heart_healthy,0)*$1
             + COALESCE(clean_label, 0)*$2
             + COALESCE(wisecode_upf,0)*$3)
             / NULLIF((CASE WHEN heart_healthy IS NOT NULL THEN $1 ELSE 0 END
                     + CASE WHEN clean_label  IS NOT NULL THEN $2 ELSE 0 END
                     + CASE WHEN wisecode_upf IS NOT NULL THEN $3 ELSE 0 END), 0))::int
              AS composite,
       (…present_count expression…)
FROM   wisecode_app.food_normalized_scores
ORDER BY composite DESC NULLS LAST, present_count DESC, food_id ASC
LIMIT 20 OFFSET 0
```

Single seq scan over a ~932K-row, narrow table. No joins, no GROUP BY,
no HashAggregate. Postgres handles this in tens of ms. Same shape works
in any engine — Postgres for the foundation, Redis sorted sets or
column-store later if consumer scale demands it.

### What we built around it

- **Two-phase browse**: phase 1 against the wide table for sort + top-K
  (returns `food_id`, `composite`, `present_count`); phase 2 against
  the normal tables for metadata + per-code label/color breakdown,
  bulk-fetched for the page's 20 food_ids in one combined query.
- **Refresh script** to maintain the table from `food_expression_foods`.
- **Per-cell clamp** at refresh time so the math is mathematically bounded.

---

## 6. Why this stack, and what changes at consumer scale

### Now (foundation, dev/early-stage traffic)

- **Postgres** as the source of truth and the read path. Already exists,
  already indexed, already fast enough at this scale.
- **Next.js + pg** in a single Node process. Simple, debuggable.
- **No caching layer** — every browse request hits the wide table fresh.
  This is _fine_ at low concurrency.

### Later (10K+ concurrent consumer reads)

The bottleneck at consumer scale won't be the query plan — the wide table
will scan in tens of ms even there. The bottleneck will be **shared-DB
contention** and **per-query economics**. Plausible next steps when that
becomes real:

- **Redis sorted sets per code** + `ZUNIONSTORE` with weights for the
  top-K merge. Native to the workload, scales horizontally, predictable
  latency.
- **Per-instance embedded DuckDB** with a sync'd copy of the wide table
  (~100 MB after compression). Reads never hit a shared DB. Sync via S3
  / signal.
- **CDN-cached precomputed pages** for popular preset slot configs.

These are options for _later_ — none of them are blocked by anything in
this foundation. The wide-table shape works in all of them.

---

## 7. Implementation map

This Next.js repo's structure corresponds to the WISEintelligence Blazor
prototype as follows. Cross-reference for anyone moving between the two.

| Concern             | Blazor prototype                                                                | This Next.js repo                                       |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Page                | `WISEintelligence/Pwa/Pages/PersonalPwa.razor`                                  | `app/page.tsx` + `app/client-stage.tsx`                 |
| Preferences screen  | `Pwa/Components/PreferencesScreen.razor`                                        | `components/PreferencesPhone.tsx`                       |
| Slot card           | `Pwa/Components/SlotCard.razor`                                                 | `components/SlotCard.tsx`                               |
| Code picker modal   | `Pwa/Components/CodePickerModal.razor`                                          | `components/CodePickerModal.tsx`                        |
| Browse screen       | `Pwa/Components/BrowseScreen.razor`                                             | `components/BrowsePhone.tsx`                            |
| Product/scan screen | `Pwa/Components/ProductScreen.razor`                                            | `components/ProductPhone.tsx`                           |
| Phone frame         | `Pwa/Components/PhoneFrame.razor`                                               | `components/PhoneFrame.tsx`                             |
| State holder        | `Pwa/Services/PwaPreferenceState.cs`                                            | `state/preferences-context.tsx`                         |
| Math helpers        | inline in `PwaPreferenceState`                                                  | `lib/composite.ts`                                      |
| DB queries          | `Pwa/Services/PwaScoringService.cs`                                             | `lib/queries.ts`                                        |
| Category map        | `Pwa/Services/PwaCategoryMap.cs`                                                | `lib/category-map.ts`                                   |
| Local storage       | `Pwa/Services/PwaLocalStorageService.cs`                                        | inline in `preferences-context.tsx`                     |
| Connection / pool   | `IDbContextFactory<WiseCodeDbContext>` (EF Core)                                | `lib/db.ts` (pg Pool, HMR-safe singleton)               |
| Refresh script      | `WISEcode.Services/Sql/FoodNormalizedScores/refresh_food_normalized_scores.sql` | `db/refresh_food_normalized_scores.sql` (mirrored copy) |

### Notable architectural shifts in the port

- **Server-rendered codes catalog** — the Blazor prototype fetches codes
  client-side on first render. Here, the codes catalog is fetched in a
  Server Component (`app/page.tsx`) so the picker is interactive on
  first paint and doesn't require a client-side fetch dance.
- **Pure composite helpers** — extracted from the imperative class methods
  into `lib/composite.ts` as pure functions. Easier to test, easier to
  reason about, easier to port to a future React Native client.
- **Context + useReducer** — replaces the Blazor scoped service. Same
  state shape, same actions, same StateChanged-equivalent re-render
  semantics. No third-party state library.
- **API routes vs direct DI** — Blazor wires the scoring service straight
  into components. Next.js needs the explicit API boundary (Client →
  Route Handler → Query). That boundary is a feature, not a cost: it's
  exactly the shape a future mobile client (React Native, Swift, Android)
  will hit.

---

## 8. What lives outside this repo

- **Refresh script for `food_normalized_scores`**: a copy now ships
  in-tree at `db/refresh_food_normalized_scores.sql` (see README §
  "Database setup"). The canonical source still lives in WISEintelligence
  at `WISEcode.Services/Sql/FoodNormalizedScores/refresh_food_normalized_scores.sql`
  — sync from there to here if they ever drift. Run the script when:
  - First setting up the app against a database (required — without it,
    Browse can't sort)
  - New codes get added to `food_expressions`
  - Scores in `food_expression_foods` change materially
  - You re-seed the database
- **Connection string**: lives in WISEintelligence's user secrets
  (`~/.microsoft/usersecrets/<id>/secrets.json`, key `ConnectionStrings:DefaultConnection`).
  This repo's `.env.local` mirrors it. When credentials rotate, update
  both.
- **The Blazor prototype itself** at `/pwa` in the WISEintelligence app —
  the original reference implementation. Keep it around as the source of
  truth for any spec questions until this repo stabilizes.

---

## 9. Known not-yet-done

- **Auth** — currently anonymous, matching the prototype's `[AllowAnonymous]`.
  When personalization-by-account becomes a feature (saved configs,
  history, shared lists), wire in Auth.js or similar.
- **Tests** — none yet. The pure functions in `lib/composite.ts` and the
  shape of `lib/queries.ts` are the natural first targets for Vitest.
  Browse / scan flows are Playwright candidates.
- **Production hardening** — CSP headers, rate limiting on API routes,
  structured logging, error reporting (Sentry / OTLP), CDN strategy.
  All deliberately deferred so this foundation doesn't accidentally make
  decisions on those that are better made later.
