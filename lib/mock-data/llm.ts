// Canned LLM responses for the compose / tags endpoints when running in
// mock mode. Routes import these so the AI flows feel alive in the demo
// without needing OPENAI_API_KEY / ANTHROPIC_API_KEY.
//
// The compose mock does a tiny keyword match on the user's description so
// different inputs yield different rubrics — enough variety to be a fun
// demo, not actual NLP.

import type { SelectableExpression } from "@/lib/types";

import expressionsJson from "./expressions.json";

const EXPRESSIONS = expressionsJson as SelectableExpression[];

interface ComposedSlot {
  expressionId: string;
  code: string;
  name: string;
  weight: number;
}

interface ComposeResponse {
  slots: ComposedSlot[];
  tags: string[];
  rationale: string;
}

const pick = (code: string): SelectableExpression | undefined =>
  EXPRESSIONS.find((e) => e.code === code);

const slot = (code: string, weight: number): ComposedSlot | null => {
  const e = pick(code);
  if (!e) return null;
  return { expressionId: e.id, code: e.code, name: e.name, weight };
};

/** Default rubric used as the fallback when no keywords match. */
const DEFAULT_RUBRIC = (): ComposeResponse => ({
  slots: [
    slot("heart_healthy", 40),
    slot("clean_label", 30),
    slot("non_upf_vs_upf", 30),
  ].filter((s): s is ComposedSlot => s !== null),
  tags: ["Heart-friendly", "Clean ingredients", "Whole-food first"],
  rationale:
    "Balanced default for someone who hasn't specified preferences. Leans on heart-healthy fats, recognizable ingredients, and whole over ultra-processed foods.",
});

interface Rule {
  match: RegExp;
  build: () => ComposeResponse;
}

const RULES: Rule[] = [
  {
    match: /\b(diabet|blood sugar|low sugar|sugar free|less sugar)\b/i,
    build: () => ({
      slots: [
        slot("sugar_density", 45),
        slot("carb_quality", 30),
        slot("clean_label", 25),
      ].filter((s): s is ComposedSlot => s !== null),
      tags: ["Low added sugar", "Smarter carbs", "Diabetic-friendly"],
      rationale:
        "Prioritizes added-sugar control and carb quality, with clean ingredients as a supporting filter.",
    }),
  },
  {
    match: /\b(muscle|gain mass|bulking|high.?protein|protein)\b/i,
    build: () => ({
      slots: [
        slot("protein_density", 50),
        slot("eaa_9", 25),
        slot("clean_label", 25),
      ].filter((s): s is ComposedSlot => s !== null),
      tags: ["High protein", "Complete amino acids", "Clean fuel"],
      rationale:
        "Built around protein density and complete-protein quality, with a clean-label backstop.",
    }),
  },
  {
    match: /\b(gut|microbiome|fiber|digest)\b/i,
    build: () => ({
      slots: [
        slot("fiber_density", 40),
        slot("gut_health", 30),
        slot("non_upf_vs_upf", 30),
      ].filter((s): s is ComposedSlot => s !== null),
      tags: ["Fiber-forward", "Gut-friendly", "Real food"],
      rationale:
        "Centers fiber and gut-health markers; minimally processed sources to avoid bringing in stuff that fights the goal.",
    }),
  },
  {
    match: /\b(natural|clean|whole.?food|real food|additive|no.?artificial)\b/i,
    build: () => ({
      slots: [
        slot("clean_label", 40),
        slot("all_natural", 30),
        slot("non_upf_vs_upf", 30),
      ].filter((s): s is ComposedSlot => s !== null),
      tags: ["Recognizable ingredients", "No artificial junk", "Whole-food first"],
      rationale:
        "All three slots target the same idea from different angles: ingredients you'd find in your kitchen, no synthetic additives, minimally processed.",
    }),
  },
  {
    match: /\b(heart|cardio|cholesterol|blood pressure)\b/i,
    build: () => ({
      slots: [
        slot("heart_healthy", 50),
        slot("fat_quality", 25),
        slot("fiber_density", 25),
      ].filter((s): s is ComposedSlot => s !== null),
      tags: ["Heart-healthy", "Smart fats", "Cardio-friendly"],
      rationale:
        "Heart-healthy index leads; fat quality and fiber back it up because both pull on the same dial in the literature.",
    }),
  },
];

export const mockCompose = (description: string): ComposeResponse => {
  for (const rule of RULES) if (rule.match.test(description)) return rule.build();
  return DEFAULT_RUBRIC();
};

/** Canned tags response — invariant to slot config, varied just enough
 *  to look like the real LLM output. */
export const mockTags = (): { tags: string[] } => ({
  tags: ["Heart-friendly", "Clean ingredients", "Whole-food first", "Smart portions"],
});
