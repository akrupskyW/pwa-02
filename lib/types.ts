// Domain types for the personalized-nutrition consumer experience.
//
// Naming convention: camelCase in the app, snake_case at the DB boundary
// (queries do the mapping). Types are framed by what a UI consumer needs,
// not what the DB happens to store.

import type { PwaCategory } from "./category-map";

/** A code the user can pick into one of their slots. */
export interface SelectableExpression {
  id: string;                          // food_expressions.id (UUID)
  code: string;                        // food_expressions.code — wide-table column name
  name: string;                        // food_expressions.name (user-visible)
  category: PwaCategory;
  /** A short marketing line ("Good for your heart"). Used as the LLM
   *  prompt's per-code summary and as a future picker tooltip. */
  shortDescription: string | null;
  /** Full explanation, used by the LLM and for any "what does this mean?"
   *  affordance we add later. */
  description: string | null;
}

/** A single per-(food, code) score entry with its interpretive metadata. */
export interface SlotScore {
  score: number;       // clamped 0-100
  label: string | null;
  color: string | null;
}

/** One slot in the user's preference config. */
export interface Slot {
  expressionId: string | null;
  weight: number;      // 0-100, all filled slots sum to 100
}

/** A food paired with its per-code scores keyed by food_expression_id. */
export interface ScoredFood {
  foodId: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  scores: Record<string, SlotScore>;
}

/** One row in the Browse list. */
export interface BrowseFood {
  foodId: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  composite: number;
  scores: Record<string, SlotScore>;
}

/** Result envelope for the paged Browse query. */
export interface BrowsePage {
  items: BrowseFood[];
  total: number;
}
