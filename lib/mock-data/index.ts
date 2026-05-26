// Mock data layer — loaded when PN_MOCK_DATA=1 OR when DATABASE_URL is
// unset. Lets a fresh clone boot the full app (browse, scan, code picker,
// AI flows) without any Postgres connection.
//
// Fixtures were captured from a real local DB on 2026-05-26 via the API
// routes:
//   - expressions.json — full /api/codes response (40 curated codes)
//   - foods.json       — 400 unique foods spanning top → tail of the
//                        weighted-score distribution, each carrying its
//                        per-expression SlotScore map
//   - upcs.json        — 183 real UPC strings → foodId, so the scan flow
//                        resolves for at least some barcodes
//
// To regenerate: `scripts/capture-mock-data.sh` (requires a live DB and
// running prod server).
//
// The mock layer mirrors the SQL shape exactly so consumers (queries.ts)
// don't need to branch downstream. Browse re-runs the composite math
// against the current slot config so weight slider drags re-sort live,
// just like the real DB-backed path.

import type {
  BrowseFood,
  BrowsePage,
  ScoredFood,
  SelectableExpression,
  Slot,
  SlotScore,
} from "@/lib/types";
import { computeComposite } from "@/lib/composite";

import expressionsJson from "./expressions.json";
import foodsJson from "./foods.json";
import upcsJson from "./upcs.json";

/** Stored fixture for a food — same shape as ScoredFood plus an optional
 *  pre-captured composite that we ignore (mock recomputes per slot config). */
interface FoodFixture {
  foodId: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  composite?: number;
  scores: Record<string, SlotScore | null>;
}

const EXPRESSIONS = expressionsJson as SelectableExpression[];
const FOODS = foodsJson as Record<string, FoodFixture>;
const UPCS = upcsJson as Record<string, string>;

const stripNulls = (scores: Record<string, SlotScore | null>): Record<string, SlotScore> => {
  const out: Record<string, SlotScore> = {};
  for (const [k, v] of Object.entries(scores)) if (v) out[k] = v;
  return out;
};

const projectScores = (
  scores: Record<string, SlotScore | null>,
  expressionIds: readonly string[],
): Record<string, SlotScore> => {
  if (expressionIds.length === 0) return {};
  const out: Record<string, SlotScore> = {};
  for (const id of expressionIds) {
    const s = scores[id];
    if (s) out[id] = s;
  }
  return out;
};

const toScoredFood = (f: FoodFixture, expressionIds: readonly string[]): ScoredFood => ({
  foodId: f.foodId,
  name: f.name,
  brand: f.brand,
  imageUrl: f.imageUrl,
  scores: projectScores(f.scores, expressionIds),
});

export const mockListSelectableExpressions = async (): Promise<SelectableExpression[]> => {
  return EXPRESSIONS;
};

export const mockScoreFoodById = async (
  foodId: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> => {
  const f = FOODS[foodId];
  if (!f) return null;
  return toScoredFood(f, expressionIds);
};

export const mockScoreFoodByUpc = async (
  upc: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> => {
  const cleaned = upc.trim();
  if (!cleaned) return null;
  const foodId = UPCS[cleaned];
  if (!foodId) return null;
  return mockScoreFoodById(foodId, expressionIds);
};

export const mockBrowseFoods = async (
  slots: readonly { expressionId: string; weight: number }[],
  offset: number,
  limit: number,
): Promise<BrowsePage> => {
  const positiveSlots = slots.filter((s) => s.weight > 0 && s.expressionId);
  if (positiveSlots.length === 0) return { items: [], total: 0 };

  // Re-shape into Slot[] so computeComposite can be reused directly.
  const slotConfig: Slot[] = positiveSlots.map((s) => ({
    expressionId: s.expressionId,
    weight: s.weight,
  }));
  const expressionIds = positiveSlots.map((s) => s.expressionId);

  // Score every food in the fixture set against the current slot config.
  // The real DB query filters to foods with at least one non-null score on
  // the requested slots; mirror that so paging totals look realistic.
  const scored: BrowseFood[] = [];
  for (const f of Object.values(FOODS)) {
    const scored_food: ScoredFood = {
      foodId: f.foodId,
      name: f.name,
      brand: f.brand,
      imageUrl: f.imageUrl,
      scores: stripNulls(f.scores),
    };
    const composite = computeComposite(slotConfig, scored_food);
    if (composite === null) continue;
    scored.push({
      foodId: f.foodId,
      name: f.name,
      brand: f.brand,
      imageUrl: f.imageUrl,
      composite,
      // Project down to just the active slots so the per-row breakdown matches
      // what the real bulkFetchDetails path returns.
      scores: projectScores(f.scores, expressionIds),
    });
  }

  scored.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    return a.name.localeCompare(b.name);
  });

  return {
    items: scored.slice(offset, offset + limit),
    total: scored.length,
  };
};
