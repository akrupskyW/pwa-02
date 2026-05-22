# Design System — Personalized Nutrition PWA

This document captures the visual design choices made for the consumer PWA, as
expressed in [PersonalizedNutrition.pen](PersonalizedNutrition.pen). Read this
alongside [PROTOTYPE.md](PROTOTYPE.md), which explains the data model and the
3-phone UX rationale; this doc covers *how it looks and feels*.

The design is deliberately **dark-luxe wellness**: deep midnight backgrounds,
glowing organic shapes, vibrant gradient accents, and per-code color identity.
The goal is to make a personal rubric feel like an artifact — yours, beautiful,
worth composing.

---

## 1. Design tokens

All tokens are stored as themed variables in the `.pen` file and intended to be
re-exported as CSS variables for the web app.

### Colors — surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#05080F` | Page background — true midnight |
| `--background-deep` | `#02040A` | Edge fades, deepest layer |
| `--surface` | `#0E1626` | Default surface |
| `--surface-2` | `#141E33` | Elevated surface |
| `--surface-3` | `#1B2742` | Hover/active surface |
| `--surface-glass` | `#1A2440CC` | Translucent glass (with backdrop-blur) |
| `--card` | `#111A2E` | Card body |
| `--card-elevated` | `#172238` | Card with subtle lift |
| `--ink-soft` | `#0A1020` | Recessed wells inside cards |

### Colors — borders & tracks

| Token | Hex | Usage |
|-------|-----|-------|
| `--border-subtle` | `#14203A` | Hairline dividers |
| `--border` | `#1F2C47` | Default card borders |
| `--border-strong` | `#2A3A5E` | Emphasized borders |
| `--track` | `#1B2440` | Slider/progress bar tracks |
| `--track-subtle` | `#0F1729` | Inner well for progress |

### Colors — text

| Token | Hex | Usage |
|-------|-----|-------|
| `--foreground-bright` | `#FFFFFF` | Big numbers, hero text |
| `--foreground` | `#F5F7FA` | Default body text |
| `--muted-foreground` | `#8794A8` | Secondary/labels |
| `--faint-foreground` | `#5A6478` | Tertiary, inactive |

### Colors — accent gradients

Always used as **2-stop linear gradients**, not solid colors. The gradient is
the brand. Per-code color identity comes from these pairings:

| Identity | Start (c1) | End (c2) | Codes / Use |
|----------|------------|----------|--------------|
| Vital (rose→amber) | `--accent-rose` `#FF5E92` | `--accent-amber` `#FF9A2A` | Heart Healthy, "vitality" |
| Clean (emerald→teal) | `--accent-emerald` `#34E5A6` | `--accent-teal` `#22D3C5` | Clean Label, "pure" |
| Plant (violet→magenta) | `--accent-violet` `#7C7CFB` | `--accent-magenta` `#C44CD4` | No UPF, plant-forward |
| Macro (gold→amber) | `--accent-gold` `#F5C14E` | `--accent-amber` `#FF9A2A` | High Protein, macros |
| Hydro (cyan→blue) | `--accent-cyan` `#5DCFFF` | `--accent-blue` `#3B82F6` | Cold/aqua reserve |

Brand-level gradient: emerald → teal → cyan → violet (used on the composite
score ring as an angular gradient — see ScoreRing component).

### Colors — score tiers

The displayed composite color depends on the value:

| Tier | Range | Color |
|------|-------|-------|
| Excellent | 90+ | `--score-excellent` `#34E5A6` |
| Good | 75–89 | `--score-good` `#22D3C5` |
| Fair | 60–74 | `--score-fair` `#F5C14E` |
| Low | 40–59 | `--score-low` `#FF9A2A` |
| Poor | <40 | `--score-poor` `#FF5E92` |

### Typography

- `--font-primary` = **Inter** — everything (display, body, labels)
- `--font-display` = **Inter** — semantic alias for hero text
- `--font-mono` = **JetBrains Mono** — reserved for UPCs / debugging readouts

Type scale used in the design:

| Role | Size | Weight | Letter-spacing |
|------|-----:|-------:|---------------:|
| Hero display | 64 | 800 | -2 |
| Screen title (H1) | 24 | 800 | -0.6 |
| Composite headline | 78 | 800 | -3 |
| Composite small | 32 | 800 | -1 |
| Big number (row) | 22–26 | 800 | -0.4 |
| Card title | 14–16 | 700 | 0 → -0.3 |
| Body | 12–13 | 500–600 | 0 |
| Label / overline | 9–11 | 700 | 0.5 → 1.8 |
| Tab label (uppercase) | 10 | 700 | 0.7 |

**Rules:**
- Title font-size is consistent across all screens (24 / 800 / -0.6).
- Big numbers use the **tier color**, not white, so the ranking is readable
  before you read the number itself.
- Overline labels (e.g., `YOUR CODE`, `BROWSE`, `SCAN RESULT`) are uppercase
  with tracked letter-spacing and colored to indicate the screen identity.

### Radii

| Token | Value | Usage |
|-------|------:|-------|
| `--radius-xs` | 8 | Inline badges |
| `--radius-s` | 12 | Small buttons, icon tiles |
| `--radius-m` | 18 | Slot/food cards |
| `--radius-l` | 24 | Hero cards |
| `--radius-xl` | 32 | Large hero containers |
| `--radius-pill` | 999 | Pills, chips, tab bar items, sliders |

The interior screen of the iPhone bezel uses a 48 corner radius; the outer
bezel uses 54 — these are bezel-specific and not in the radius scale.

### Spacing

Wrapper padding inside a phone screen: **`[0, 20, 20, 20]`** (no top — status
bar sits flush).

| Context | Gap |
|---------|----:|
| Major sections inside a screen | 16–20 |
| Items within a section | 8–12 |
| Inside cards | 10–14 |
| Between icon + label | 6–10 |
| Inside button | 8 |

Tab bar floats absolutely at `y: 758` (24 from screen bottom edge) with `x: 24`
and width 330 inside the 378-wide screen.

### Effects

- **Outer card shadows**: `offset {0, 8–12}`, `blur 24–32`, `spread -8`,
  color = accent at `22–66` alpha. Subtle, colored to match the card's gradient.
- **Halo glow** behind score rings: large radial gradient at `0.7–0.9` opacity,
  start color = tier color at `55` alpha, end transparent.
- **Slider thumb shadow**: `offset {0, 2}`, `blur 6`, `color #000000AA`.
- **Active-tab glow**: subtle 1px gradient stroke matching the screen's
  accent (`#34E5A655` for green tabs, `#7C7CFB55` for violet).

---

## 2. Reusable components

All components are reusable nodes in the `.pen` file (off-canvas at x:-2000)
and instanced into the three screens.

### `component/PhoneFrame`

- **Size**: 390 × 844 (iPhone 14/15 portrait).
- **Bezel**: 3px gradient stroke from `#2A3550` → `#0A1020` at 135°, outer
  drop shadow `{0, 30, blur 60, spread -10, #000000AA}` plus a 1px hairline
  highlight `#FFFFFF18` to sell the glass edge.
- **Corner radius**: outer 54, inner screen 48, no padding between.
- **Dynamic island**: 120 × 34, fully black, centered at (135, 14), with a
  pulsing teal `#22D3C5` dot inside to imply liveness.
- **Screen slot** (`APOVf`): the descendant that each instance overrides with
  its own screen contents (vertical flex, clip:true).

### `component/StatusBar`

- 378 × 62, transparent fill.
- Horizontal flex, space-between, padded `[0, 24]`.
- Left: "9:41" in Inter 17/600, white.
- Right: 4-bar signal indicator (4 bars of increasing height, 4×4→4×10),
  Material Symbols Rounded `wifi` icon, then battery (28×14 outlined with
  21×9 fill inside).

### `component/ScoreRing`

The signature component — a glowing angular-gradient ring around a number.

- 220 × 220 outer.
- **Halo**: 260 × 260 radial gradient (`#34E5A655` → transparent) at 0.7
  opacity, positioned at (-20, -20).
- **Track arc**: ellipse with `innerRadius: 0.86`, fill `--track`.
- **Progress arc**: same ring, `startAngle: 90, sweepAngle: -320`
  (animated 0→-360 in code), fill is an **angular gradient** going
  `#34E5A6 → #22D3C5 → #5DCFFF → #7C7CFB` clockwise.
- **Tip dot**: 14 × 14 ellipse positioned at the arc's tip, with an outer
  glow shadow `{blur 14, spread 1, #34E5A6CC}`.
- **Center label**: vertical flex, centered, big number (80/800/-3) above an
  overline (`YOUR SCORE`, 10/700/+1.4).

### `component/CodeChip`

- Horizontal pill: padding `[8, 14, 8, 10]`, gap 8, `cornerRadius 999`.
- Fill `#172238`, stroke `1px #243049`.
- Children: 8 × 8 colored dot with glow shadow, then label (12/600).
- Default dot color is `#34E5A6` (excellent); instances override the dot
  fill and label content.

### `component/TabBar`

- 330 × 62 pill (`cornerRadius 36`), padding 4 all sides.
- Pill fill: translucent `#0D1422EB` (92% alpha) — solid enough that
  scroll-area content does NOT bleed through. The .pen mockup uses a
  lighter alpha + backdrop blur for the floating preview; the shipped
  implementation anchors the pill instead (see below).
- 3 tab items, each `fill_container` width, vertical flex centered, gap 3.
  - **Active tab**: gradient fill `#1B2742 → #243558` (135°), 1px stroke in
    the screen's accent color at 55 alpha (green on CODE/SCAN, violet on
    BROWSE), icon + label in foreground.
  - **Inactive tab**: transparent fill, icon + label in `--faint-foreground`.
- Labels are uppercase 10/700 with 0.7 letter-spacing (CODE, BROWSE, SCAN).
- Icons (lucide): `sliders-horizontal`, `layout-grid`, `scan-line` at 20×20.

**Placement — anchored, not floating.** The mobile-app guideline calls for
a floating pill that hovers over the scroll area with backdrop blur. We
ship the pill *anchored* at the bottom of the phone shell as a flex-flow
sibling of the scroll area, with a solid-enough background that no content
peeks through. Rationale: the same guideline's rule that "App content must
never be obscured by the Tab Bar" is hard to keep when an interactive
element (e.g. "+ Add a code") lives at the bottom of a list — the floating
version visibly covered it through the translucent glass. Anchoring keeps
the pill aesthetic and removes the overlap entirely. The container above
the pill carries a thin top hairline and a 12 px backdrop-blur transition
band so the bar still reads as "lifted" rather than welded to the screen.

---

## 3. Screen blueprints

All three screens follow the mobile-app guideline:

```
Status bar (62 px)
└── Wrapper (one vertical stack, padding [0, 20, 20, 20], gap 16–20)
    ├── Header (overline + title left, action(s) right)
    ├── Section frames (cards, lists, etc.)
    └── ...
Tab bar (absolute, y:758, x:24, width 330)
```

### Phone 1 — "Your Code" (Preferences)

- **Overline / screen color**: `YOUR CODE` in `#34E5A6` (green identity).
- **Title**: "Personal Rubric".
- **Avatar**: 38×38 round, gradient violet→emerald, single initial.
- **Hero card**: horizontal — left is a small 104×104 angular-ring score
  block showing weight allocation (100 of 100); right column is the
  "In Harmony" heading + descriptor + three style chips (Whole/Plant/Lean).
- **Section header**: "YOUR CODES · 4 / 5" + a small Reset pill button.
- **Slot cards** (4): each is a card with:
  - 38×38 gradient icon tile (per-code gradient + lucide icon)
  - Code name (14/700) + category (10/600 muted)
  - Big weight number (22/800) + `%` (11/700 muted)
  - Below: a 8-tall gradient slider with a white thumb dot
- **Empty slot**: dashed-stroke button "+ Add a code".
- **Tab bar**: CODE active in green.

Per-code gradient mapping shown:

| Code | c1 | c2 | Icon |
|------|----|----|------|
| Heart Healthy | `#FF5E92` | `#FF9A2A` | `heart-pulse` |
| Clean Label | `#34E5A6` | `#22D3C5` | `sparkles` |
| No Ultra-Processed | `#7C7CFB` | `#C44CD4` | `leaf` |
| High Protein | `#F5C14E` | `#FF9A2A` | `dumbbell` |

### Phone 2 — "Top Matches" (Browse)

- **Overline / screen color**: `BROWSE` in `#7C7CFB` (violet identity).
- **Title**: "Top Matches".
- **Header actions**: 38×38 search + sliders icon buttons (filled card style).
- **Active-codes chip row**: 4 chips showing the current rubric
  ("Heart 35", "Clean 28", "UPF 22", "Protein 15") with colored dots.
- **Featured card** (TOP MATCH):
  - 84×84 gradient image tile (per food)
  - "TOP MATCH" pill badge (`#34E5A6` fill, black text, crown icon)
  - Food name (15/700) + brand
  - 64×64 mini score ring with composite (22/800)
  - Below: 4-segment **contribution meter** — one gradient bar per code,
    proportional to weight, with the food's per-code score under each.
- **List header**: "ALL RESULTS · 12,847" + "Best Match ▾" sort pill.
- **List rows** (5):
  - 54×54 gradient thumbnail with lucide icon
  - Name (13/700) + brand (10/500 muted)
  - 4 colored dots + "4 codes match" label
  - Right: huge score in tier color (26/800) + "✓ 4/4" present-count badge
- **Tab bar**: BROWSE active in violet.

### Phone 3 — "Product Detail" (Scan)

- **Overline / screen color**: `SCAN RESULT` in `#34E5A6` (green).
- **Title**: "Product Detail".
- **Header**: 36×36 back button left; 36×36 share + bookmark icon buttons
  right.
- **Hero card** (24 corner radius, green-tinted shadow):
  - 72×72 gradient product image with lucide icon
  - Name (16/800/-0.3) + brand + UPC badge with barcode icon
  - **Composite ring**: 200×200, halo glow, big "94" (78/800/-3) + small
    `COMPOSITE` overline in green
  - Verdict row: green check icon + "Excellent match for your code".
- **Math header**: "THE MATH" + "score × weight = contribution" caption.
- **Breakdown rows** (one per code):
  - 30×30 gradient icon tile
  - Code name + tier badge (gradient pill with code's c1/c2)
  - `92 × 35% = 32.2` math line in muted
  - Big score (22/800) in code's c1 color
  - 6-tall gradient progress bar at bottom
- **Tab bar**: SCAN active in green.

---

## 4. Demo stage

The marketing/preview composition uses all three phones side by side:

- **Container**: 1600 × auto (cap 1300), dark gradient
  `#05080F → #0A1426 → #05080F` top-to-bottom.
- **Background glows**: 3 large radial gradients (emerald, violet, teal)
  positioned to glow behind each phone.
- **Hero header** (centered, 80px side padding):
  - Overline: "PERSONALIZED NUTRITION" in green
  - H1: "Bring your own rubric." (64/800/-2)
  - Subhead: 760-wide center-aligned paragraph in muted foreground
  - Primary CTA: gradient emerald→teal pill, "Try the demo →", with a
    `{0, 10, blur 28, spread -6, #34E5A688}` colored glow
  - Secondary CTA: translucent ghost pill with play icon
- **Phones row**: horizontal flex, gap 30, justify center, top-aligned.

---

## 5. Design principles

A few opinions baked into every screen:

1. **One identity color per screen.** The overline label, the active tab,
   and the screen's accent glow all share the same color. CODE = green,
   BROWSE = violet, SCAN = green. The user always knows where they are.
2. **Per-code identity is a gradient, not a color.** Codes have two-stop
   gradients so they read as "things with depth," not category tags.
3. **The score is the protagonist.** Big, tier-colored, never apologetic.
   The smallest score in the design is 22 px; the largest is 78 px.
4. **Math is visible.** The "score × weight = contribution" line stays
   visible on the detail screen — the composite is not magic.
5. **Glass and glow over flat fills.** Cards use subtle gradients,
   translucency, and colored shadows; pure flat fills are reserved for the
   deepest wells (tracks, inactive backgrounds).
6. **Dark, always.** There is no light theme planned for v1. The midnight
   palette is the brand.

---

## 6. AI-assisted composition

The Preferences hero is the only AI surface in v1. Two LLM calls, three
visual states.

### Endpoints

| Route | Input | Output | Used by |
|-------|-------|--------|---------|
| `POST /api/code/compose` | `{ description: string }` | `{ slots: [{expressionId, code, name, weight}], tags: string[], rationale: string }` | TalkToAISheet's Compose button |
| `POST /api/code/tags` | `{ slots: [{code, weight}] }` | `{ tags: string[] }` | AITagRow's Ask-AI / refresh button |

Both routes are server-rendered (`runtime = "nodejs"`), force-dynamic, and
hit the catalog (`listSelectableExpressions`) before calling the model so
the model always sees the current set of codes — no rebuild needed when a
new code is added to `food_expressions`. The model works in **slugs only**;
the compose route resolves slugs → UUIDs server-side, so the client just
gets `expressionId` ready for a `REPLACE_SLOTS` dispatch.

The compose route also **normalizes weights to exactly 100** after the
model returns — if the model says 35/30/30/10 (sum 105) we scale to 33/29/29/9
and add the rounding drift back to the largest slot. The model gets a clear
instruction to sum to 100; this is just defense in depth.

### Provider abstraction

[lib/llm.ts](lib/llm.ts) is a thin gateway over the Vercel AI SDK.
Provider is selected by `LLM_PROVIDER` (`openai` | `anthropic`). Defaults:

- OpenAI: `gpt-5` (a reasoning model — the gateway omits `temperature`
  unless the caller explicitly opts in, since reasoning models reject it).
- Anthropic: `claude-opus-4-7`.

Structured outputs are enforced by Zod schemas
([lib/code-prompts.ts](lib/code-prompts.ts) §Schemas). No "parse the prose"
fallback — invalid JSON throws and the caller renders an error state.

### Three hero states (matched to the .pen variants)

1. **Empty (Variant A)** — `filledCount === 0`. The hero becomes the
   `<AIEmptyHero>`: sparkle icon, "Compose your code with AI", and a
   gradient `Talk it through` CTA. The header right-slot hides the
   avatar; the manual "+ Add a code" path is still visible below, but
   the AI route is the obvious one.

2. **Fresh tags (Variant B)** — `aiTags && !aiTagsStale`. Standard
   compact hero (small ring + "In Harmony" copy) with
   `<AITagRow>` rendering 3–4 AI tag chips below the description.
   Provenance is signalled by a tiny `sparkles` glyph inside each chip
   (per user preference — see DESIGN.md §5 "AI-generated tags carry
   provenance"). The header right-slot becomes the
   `<TalkToAIHeaderPill>` so the sheet is one tap away.

3. **Stale tags (Variant C)** — `aiTags && aiTagsStale`. Same hero, but
   the chip row collapses to a single dashed-border ghost button "Ask AI
   for new tags". One tap fires `/api/code/tags` against the current
   signature and the row flips back to fresh chips. This is the
   non-destructive path: weights stay, only the tags refresh.

The fourth implicit state — `filledCount > 0 && !state.aiTags` — also
shows the dashed ghost button, labeled "Ask AI for tags". Same call,
same destination state.

### Staleness detection

[state/preferences-context.tsx](state/preferences-context.tsx) keeps the
AI tags alongside the **slot signature** they were generated against
(`JSON.stringify(filledSlots.map(s => [expressionId, weight]))`). Any
slot change recomputes the current signature; when it differs from the
stored one, `aiTagsStale = true`. No debounce — staleness is immediate.
Tags don't auto-refresh; the user always taps to spend an LLM call.

### Talk-to-AI sheet

`<TalkToAISheet>` is a bottom sheet (~75% height) that overlays the phone
screen. It carries: a textarea (1200 char max), 3 example prompts that
preload the textarea when tapped, a Cancel/Compose action row, and an
inline error region. On Compose:

1. POST `/api/code/compose`.
2. On success: `REPLACE_SLOTS` with the model's slots, then `SET_AI_TAGS`
   with the new tags + the new signature, then close the sheet.
3. On failure: error message stays in the sheet; user can retry.

Replacement is destructive by design (per the AI's job: compose the
code). Undo isn't built in v1 — if you want your old config back, talk
to AI again.

### Localstorage

`pn.aiTags` joins `pn.slots` and `pn.foodId` in localStorage with the
shape `{ tags: string[], signature: string }`. So a refresh keeps the
fresh-vs-stale status correctly.

---

## 7. Implementation notes

- The `.pen` design file is authoritative for visual decisions. When code
  and design drift, update [PersonalizedNutrition.pen](PersonalizedNutrition.pen)
  *and* the corresponding Tailwind tokens together.
- Tailwind config ([tailwind.config.ts](tailwind.config.ts)) should mirror
  the variables in section 1. Currently it has a smaller `stage` / `screen`
  / `accent` palette — extend it with the full token set.
- The angular gradient on `ScoreRing` is a single conic gradient in CSS.
  Browsers without conic support fall back to the start color.
- The `background_blur` effect on TabBar maps to `backdrop-filter: blur(20px)`
  with a translucent background.
- Per-code gradient mapping should live in `lib/category-map.ts` so both
  the slot card and the breakdown rows can pull the same `{ c1, c2, icon }`
  tuple per code slug.
