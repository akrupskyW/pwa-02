// Database queries for the personalized-nutrition consumer experience.
// Same data shape as the WISEintelligence prototype's PwaScoringService —
// rewritten for pg / TypeScript with the same wide-table sort strategy.
//
// Four entry points:
//   listSelectableExpressions          — codes available in the picker
//   browseFoods                        — paged composite-sorted browse list
//   scoreFoodById                      — one food + per-code breakdown by food_id
//   scoreFoodByUpc                     — one food + per-code breakdown by UPC

import { query } from "./db";
import { lookupCategory } from "./category-map";
import {
  mockBrowseFoods,
  mockListSelectableExpressions,
  mockScoreFoodById,
  mockScoreFoodByUpc,
} from "./mock-data";
import { isMockMode } from "./mock-mode";
import type { BrowsePage, ScoredFood, SelectableExpression, SlotScore } from "./types";

/** Postgres double-quote identifier quoting; doubles embedded `"`. */
const quoteIdent = (ident: string): string => {
  return `"${ident.replace(/"/g, '""')}"`;
};

/** Clamp a raw numeric score (decimal-or-null from PG) to a 0-100 integer. */
const clampScore = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
};

// ─── Codes catalog ────────────────────────────────────────────────────────────

interface FoodExpressionRow {
  id: string;
  code: string | null;
  name: string | null;
  short_description: string | null;
  description: string | null;
}

export const listSelectableExpressions = async (): Promise<SelectableExpression[]> => {
  if (isMockMode()) return mockListSelectableExpressions();
  const rows = await query<FoodExpressionRow>(
    `SELECT id, code, name, short_description, description
     FROM   wisecode_app.food_expressions
     WHERE  active = true OR render_type IN ('TopLevel', 'Complex')`,
    [],
    "listSelectableExpressions",
  );

  const out: SelectableExpression[] = [];
  for (const r of rows) {
    if (!r.code || !r.name) continue;
    const category = lookupCategory(r.code);
    if (!category) continue; // outside the curated picker
    out.push({
      id: r.id,
      code: r.code,
      name: r.name,
      category,
      shortDescription: r.short_description,
      description: r.description,
    });
  }
  return out;
};

// ─── Per-food: by id ──────────────────────────────────────────────────────────

interface FoodRow {
  id: string;
  name: string | null;
  brand: string | null;
  product_image_url: string | null;
}

interface ScoreRow {
  food_expression_id: string;
  normalized_score: string | number | null;
  label: string | null;
  color: string | null;
}

export const scoreFoodById = async (
  foodId: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> => {
  if (isMockMode()) return mockScoreFoodById(foodId, expressionIds);
  const foodRows = await query<FoodRow>(
    `SELECT id, name, brand, product_image_url
     FROM   wisecode_gold.food
     WHERE  id = $1
     LIMIT  1`,
    [foodId],
    "scoreFoodById.food",
  );
  const food = foodRows[0];
  if (!food) return null;

  const scores = await readScores(foodId, expressionIds);

  return {
    foodId: food.id,
    name: food.name ?? "",
    brand: food.brand,
    imageUrl: food.product_image_url,
    scores,
  };
};

// ─── Per-food: by UPC ─────────────────────────────────────────────────────────

export const scoreFoodByUpc = async (
  upc: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> => {
  if (isMockMode()) return mockScoreFoodByUpc(upc, expressionIds);
  if (!upc.trim()) return null;

  let resolved = await resolveByUpc(upc);
  // EAN-13 fallback: a 13-digit UPC starting with 0 is a UPC-A; retry without the leading 0.
  if (!resolved && upc.length === 13 && upc.startsWith("0")) {
    resolved = await resolveByUpc(upc.substring(1));
  }
  if (!resolved) return null;

  const scores = await readScores(resolved.id, expressionIds);

  return {
    foodId: resolved.id,
    name: resolved.name ?? "",
    brand: resolved.brand,
    imageUrl: resolved.product_image_url,
    scores,
  };
};

const resolveByUpc = async (upc: string): Promise<FoodRow | null> => {
  const rows = await query<FoodRow>(
    `SELECT f.id, f.name, f.brand, f.product_image_url
     FROM   wisecode_gold.product p
     INNER JOIN wisecode_gold.food f ON p.food_id = f.id
     WHERE  $1 = ANY(p.upc)
     LIMIT  1`,
    [upc],
    "scoreFoodByUpc.resolve",
  );
  return rows[0] ?? null;
};

const readScores = async (
  foodId: string,
  expressionIds: readonly string[],
): Promise<Record<string, SlotScore>> => {
  const out: Record<string, SlotScore> = {};
  if (expressionIds.length === 0) return out;

  const rows = await query<ScoreRow>(
    `SELECT fef.food_expression_id, fef.normalized_score, fevi.label, fevi.color
     FROM   wisecode_app.food_expression_foods fef
     LEFT JOIN wisecode_app.food_expression_value_interpretations fevi
            ON fef.food_expression_value_interpretation_id = fevi.id
     WHERE  fef.food_id = $1
       AND  fef.food_expression_id = ANY($2::uuid[])`,
    [foodId, expressionIds],
    "readScores",
  );

  for (const r of rows) {
    const clamped = clampScore(r.normalized_score);
    if (clamped === null) continue;
    out[r.food_expression_id] = {
      score: clamped,
      label: r.label,
      color: r.color,
    };
  }
  return out;
};

// ─── Browse (paged, two-phase) ────────────────────────────────────────────────

interface SlotConfig {
  expressionId: string;
  weight: number;
}

interface PageRow {
  food_id: string;
  composite: number | null;
  present_count: number;
}

interface DetailRow {
  id: string;
  name: string | null;
  brand: string | null;
  product_image_url: string | null;
  food_expression_id: string | null;
  normalized_score: string | number | null;
  label: string | null;
  color: string | null;
}

interface SlugRow {
  id: string;
  code: string | null;
}

export const browseFoods = async (
  slots: readonly SlotConfig[],
  offset: number,
  limit: number,
): Promise<BrowsePage> => {
  if (isMockMode()) return mockBrowseFoods(slots, offset, limit);
  const positiveSlots = slots.filter((s) => s.weight > 0);
  if (positiveSlots.length === 0) {
    return { items: [], total: 0 };
  }

  const expressionIds = positiveSlots.map((s) => s.expressionId);

  // 1. expressionId → slug (wide-table column name).
  const slugMap = await getSlugMap(expressionIds);
  const resolvedSlots = positiveSlots.filter((s) => slugMap.has(s.expressionId));
  if (resolvedSlots.length === 0) {
    return { items: [], total: 0 };
  }

  // 2. Constant per-user total (cheap PK count).
  const total = await countWide();

  // 3. Phase 1: weighted-sum top-K against the wide table.
  const page = await browsePage(resolvedSlots, slugMap, offset, limit);
  if (page.length === 0) return { items: [], total };

  // 4. Phase 2: bulk metadata + breakdown for the page's food_ids.
  const foodIds = page.map((p) => p.food_id);
  const detailMap = await bulkFetchDetails(foodIds, expressionIds);

  // 5. Assemble in phase-1 (composite DESC, present_count DESC) order.
  const items = page
    .map((p) => {
      const d = detailMap.get(p.food_id);
      if (!d) return null;
      return {
        foodId: p.food_id,
        name: d.name ?? "",
        brand: d.brand,
        imageUrl: d.imageUrl,
        composite: p.composite ?? 0,
        scores: d.scores,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return { items, total };
};

const getSlugMap = async (expressionIds: readonly string[]): Promise<Map<string, string>> => {
  const m = new Map<string, string>();
  if (expressionIds.length === 0) return m;

  const rows = await query<SlugRow>(
    `SELECT id, code
     FROM   wisecode_app.food_expressions
     WHERE  id = ANY($1::uuid[])
       AND  code IS NOT NULL
       AND  TRIM(code) <> ''`,
    [expressionIds],
    "browse.slugs",
  );
  for (const r of rows) {
    if (r.code) m.set(r.id, r.code);
  }
  return m;
};

const countWide = async (): Promise<number> => {
  const rows = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM wisecode_app.food_normalized_scores`,
    [],
    "browse.count",
  );
  return rows[0]?.total ?? 0;
};

const browsePage = async (
  resolvedSlots: readonly SlotConfig[],
  slugMap: Map<string, string>,
  offset: number,
  limit: number,
): Promise<PageRow[]> => {
  // Build dynamic weighted-composite SQL. Weights are positional parameters
  // ($1..$n). The trailing two params are limit ($n+1) and offset ($n+2).
  const numParts: string[] = [];
  const denParts: string[] = [];
  const presentParts: string[] = [];
  const params: unknown[] = [];

  for (const slot of resolvedSlots) {
    const slug = slugMap.get(slot.expressionId);
    if (!slug) continue;
    const col = quoteIdent(slug);
    params.push(slot.weight);
    const p = `$${params.length}`;
    numParts.push(`COALESCE(${col}, 0) * ${p}`);
    denParts.push(`CASE WHEN ${col} IS NOT NULL THEN ${p} ELSE 0 END`);
    presentParts.push(`CASE WHEN ${col} IS NOT NULL THEN 1 ELSE 0 END`);
  }

  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const sql = `
    SELECT food_id,
           ROUND((${numParts.join(" + ")}) / NULLIF(${denParts.join(" + ")}, 0))::int AS composite,
           (${presentParts.join(" + ")}) AS present_count
    FROM   wisecode_app.food_normalized_scores
    ORDER BY composite DESC NULLS LAST, present_count DESC, food_id ASC
    LIMIT  ${limitParam} OFFSET ${offsetParam}
  `;

  return query<PageRow>(sql, params, "browse.page");
};

interface DetailEntry {
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  scores: Record<string, SlotScore>;
}

const bulkFetchDetails = async (
  foodIds: readonly string[],
  expressionIds: readonly string[],
): Promise<Map<string, DetailEntry>> => {
  const out = new Map<string, DetailEntry>();
  if (foodIds.length === 0) return out;

  const rows = await query<DetailRow>(
    `SELECT f.id, f.name, f.brand, f.product_image_url,
            fef.food_expression_id, fef.normalized_score,
            fevi.label, fevi.color
     FROM   wisecode_gold.food f
     LEFT JOIN wisecode_app.food_expression_foods fef
            ON fef.food_id = f.id
           AND fef.food_expression_id = ANY($2::uuid[])
     LEFT JOIN wisecode_app.food_expression_value_interpretations fevi
            ON fevi.id = fef.food_expression_value_interpretation_id
     WHERE  f.id = ANY($1::uuid[])`,
    [foodIds, expressionIds],
    "browse.details",
  );

  for (const r of rows) {
    let entry = out.get(r.id);
    if (!entry) {
      entry = {
        name: r.name,
        brand: r.brand,
        imageUrl: r.product_image_url,
        scores: {},
      };
      out.set(r.id, entry);
    }
    if (!r.food_expression_id) continue;
    const clamped = clampScore(r.normalized_score);
    if (clamped === null) continue;
    entry.scores[r.food_expression_id] = {
      score: clamped,
      label: r.label,
      color: r.color,
    };
  }
  return out;
};
