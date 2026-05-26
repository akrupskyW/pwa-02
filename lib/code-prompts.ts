// Prompt builders + Zod schemas shared by /api/code/compose and
// /api/code/tags. Centralized so the model has a single, consistent view
// of the catalog across both calls.

import { z } from "zod";
import type { SelectableExpression } from "./types";

const MAX_SLOTS = 5;

// ─── Schemas ─────────────────────────────────────────────────────────────

/** A single AI-chosen slot. Uses code slug, not UUID, so the model never
 *  has to think about identifiers it didn't see in the catalog input. */
export const aiSlotSchema = z.object({
  code: z
    .string()
    .describe(
      "The food_expressions.code slug (e.g. 'heart_healthy'). Must be a slug from the provided catalog.",
    ),
  weight: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Integer percentage. The full set of slots' weights must sum to exactly 100."),
});
export type AiSlot = z.infer<typeof aiSlotSchema>;

/** A single descriptive tag — 1–2 words, used as a pill in the hero. */
export const aiTagSchema = z
  .string()
  .min(2)
  .max(24)
  .describe("A short descriptor (1–2 words) capturing one facet of the chosen portfolio.");

/** Response shape for /api/code/compose. */
export const composeResponseSchema = z.object({
  slots: z
    .array(aiSlotSchema)
    .min(1)
    .max(MAX_SLOTS)
    .describe(`Up to ${MAX_SLOTS} slots chosen from the catalog. Weights MUST sum to exactly 100.`),
  tags: z
    .array(aiTagSchema)
    .min(3)
    .max(4)
    .describe(
      "Three or four short, evocative descriptors that capture the personality of the resulting code.",
    ),
  rationale: z
    .string()
    .max(280)
    .describe("One short sentence (max 280 chars) explaining the composition. User-facing."),
});
export type ComposeResponse = z.infer<typeof composeResponseSchema>;

/** Response shape for /api/code/tags. */
export const tagsResponseSchema = z.object({
  tags: z.array(aiTagSchema).min(3).max(4),
});
export type TagsResponse = z.infer<typeof tagsResponseSchema>;

// ─── Catalog payload ──────────────────────────────────────────────────────

/** The LLM-facing view of a single code. Strips DB-internal identifiers
 *  (UUIDs) since the model works in slugs. */
export interface CatalogEntry {
  code: string;
  name: string;
  category: string;
  shortDescription: string | null;
  description: string | null;
}

export const toCatalog = (codes: readonly SelectableExpression[]): CatalogEntry[] => {
  return codes.map((c) => ({
    code: c.code,
    name: c.name,
    category: c.category,
    shortDescription: c.shortDescription,
    description: c.description,
  }));
};

// ─── Prompts ──────────────────────────────────────────────────────────────

const SYSTEM_PRELUDE = `You are the "code composer" for WISEcode, a personalized nutrition app.

A "code" is the user's personal scoring rubric for food. It is composed of up to ${MAX_SLOTS} "slots", each containing a single food-expression code (e.g. heart_healthy, clean_label, wisecode_upf) and an integer weight 1–100. The weights across all chosen slots MUST sum to exactly 100.

You will be given the full catalog of available codes (slug, name, category, shortDescription, description). You must ONLY use code slugs from this catalog. Do not invent codes.

Tags you generate describe the *personality* of the resulting code in 1–2 words each — they are pills shown above the user's slot list. Examples of good tags: "Whole foods", "Heart-aware", "Plant-forward", "Lean", "Clean label", "Macro-tuned". Bad tags: full sentences, single letters, generic words ("Healthy"), brand names.`;

/** Build the system prompt for /api/code/compose. */
export const composeSystemPrompt = (): string => {
  return `${SYSTEM_PRELUDE}

Your task right now: read the user's free-text description of what matters to them, then pick up to ${MAX_SLOTS} slots from the catalog that best express their priorities, assign integer weights that sum to 100, write 3–4 short tags, and a one-sentence rationale.

Selection rules:
- Prefer fewer high-weight slots over many low-weight slots when the user's intent is focused. Don't pad the list to 5 if 3 cleanly captures the request.
- Weights should reflect relative importance the user implied (or stated). A passing mention is ~10–15. A clearly emphasized priority is 25+.
- If the user expresses conflicting goals, pick the dominant intent and explain in the rationale.
- If the user's text is empty, unclear, or off-topic, pick a sensible "balanced default": heart_healthy 40, clean_label 30, wisecode_upf 30, with tags like "Balanced", "Heart-aware", "Clean".`;
};

/** Build the user-turn prompt for /api/code/compose. */
export const composeUserPrompt = (description: string, catalog: CatalogEntry[]): string => {
  return `# User description
${description.trim() || "(no description provided)"}

# Catalog
${JSON.stringify(catalog, null, 2)}`;
};

/** Build the system prompt for /api/code/tags. */
export const tagsSystemPrompt = (): string => {
  return `${SYSTEM_PRELUDE}

Your task right now: given the user's CURRENT slot configuration (codes + weights that already sum to 100), produce 3–4 short tags that capture the personality of this portfolio. You are NOT changing the slots — only labeling them.`;
};

/** Build the user-turn prompt for /api/code/tags. */
export const tagsUserPrompt = (
  slots: { code: string; name: string; category: string; weight: number }[],
  catalog: CatalogEntry[],
): string => {
  return `# Current slots
${JSON.stringify(slots, null, 2)}

# Catalog (for context on what each code means)
${JSON.stringify(catalog, null, 2)}`;
};
