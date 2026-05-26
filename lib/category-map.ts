// Curated mapping of food_expressions.code → consumer-facing picker section.
//
// Faithful port of the WISEintelligence Blazor PwaCategoryMap
// (WISEintelligence/Pwa/Services/PwaCategoryMap.cs). The display labels are
// cleaner consumer phrasings of Blazor's category enum names; the code-to-
// category mappings themselves are copied verbatim. Both the demo app
// (/demo, the side-by-side 3-phone stage) and the routed mobile prototype
// (/, with the bottom-tab navigation) consume this single source of truth
// via CodePickerModal.
//
// Codes NOT present here are deliberately excluded from the picker, so the
// consumer surface stays curated even as wisecode_app.food_expressions
// grows. Eventually food_expressions may gain its own category column and
// this whole map can be replaced by a join.

export type PwaCategory =
  | "Composite Scores" // Blazor: PwaCategory.Top
  | "Health Outcomes" // Blazor: PwaCategory.Outcomes
  | "Overall Quality" // Blazor: PwaCategory.Quality
  | "Nutrient Focus" // Blazor: PwaCategory.Nutrients
  | "Processing Level" // Blazor: PwaCategory.Processing
  | "Clean & Natural" // Blazor: PwaCategory.Clean
  | "Avoid Ingredients" // Blazor: PwaCategory.Avoid
  | "Allergens & Sensitivities" // Blazor: PwaCategory.Allergen
  | "Industry Codes"; // Blazor: PwaCategory.Industry

const MAP: Readonly<Record<string, PwaCategory>> = {
  // Composite Scores — top-level synthesized scores
  wise_score: "Composite Scores",
  thrive_score: "Composite Scores",

  // Health Outcomes
  heart_healthy: "Health Outcomes",
  diabetes_friendly: "Health Outcomes",
  gut_health: "Health Outcomes",
  muscle_health: "Health Outcomes",
  anti_inflammatory: "Health Outcomes",

  // Overall Quality
  iq_score: "Overall Quality",
  nq_score: "Overall Quality",
  carb_quality: "Overall Quality",
  fat_quality: "Overall Quality",

  // Nutrient Focus — specific nutrients
  protein_density: "Nutrient Focus",
  fiber_density: "Nutrient Focus",
  sugar_density: "Nutrient Focus",
  calorie_quality: "Nutrient Focus",
  eaa_9: "Nutrient Focus",
  excellent_source: "Nutrient Focus",

  // Processing Level
  wisecode_upf: "Processing Level",
  non_upf_vs_upf: "Processing Level",
  nova_food_classification_system: "Processing Level",
  california_ab_1264_upf: "Processing Level",
  texas_sb_25_upf: "Processing Level",
  tx_sb25: "Processing Level",

  // Clean & Natural
  clean_label: "Clean & Natural",
  all_natural: "Clean & Natural",
  gras_plus: "Clean & Natural",
  sketchy: "Clean & Natural",
  maha: "Clean & Natural",

  // Avoid Ingredients — negative patterns (100 = absent)
  high_fructose_corn_syrup: "Avoid Ingredients",
  artificial_sweetener: "Avoid Ingredients",
  artificial_preservative: "Avoid Ingredients",
  artificial_color: "Avoid Ingredients",
  artificial_flavor: "Avoid Ingredients",
  seed_oil: "Avoid Ingredients",
  hateful_eight_seed_oil: "Avoid Ingredients",
  emulsifier: "Avoid Ingredients",
  watchout: "Avoid Ingredients",
  hyperpalatability: "Avoid Ingredients",

  // Allergens & Sensitivities — includes histamine sensitivity (same
  // "avoid for sensitive individuals" framing as allergens)
  allergen: "Allergens & Sensitivities",
  allergen_milk: "Allergens & Sensitivities",
  allergen_eggs: "Allergens & Sensitivities",
  allergen_peanuts: "Allergens & Sensitivities",
  allergen_tree_nuts: "Allergens & Sensitivities",
  allergen_soybeans: "Allergens & Sensitivities",
  allergen_wheat: "Allergens & Sensitivities",
  allergen_fish: "Allergens & Sensitivities",
  allergen_shellfish: "Allergens & Sensitivities",
  allergen_sesame: "Allergens & Sensitivities",
  histamine_level: "Allergens & Sensitivities",

  // Industry / third-party
  guiding_stars: "Industry Codes",

  // Intentionally NOT in the picker (still exists in food_expressions but
  // not surfaced): yikes_score_sort_value — a DataEngineeringBased sort
  // helper that duplicates wisecode_upf.
};

// Ordered consumer-most-relevant first. CodePickerModal renders sections
// in this order, skipping any with no matching codes.
export const PWA_CATEGORY_ORDER: readonly PwaCategory[] = [
  "Composite Scores",
  "Health Outcomes",
  "Overall Quality",
  "Nutrient Focus",
  "Processing Level",
  "Clean & Natural",
  "Avoid Ingredients",
  "Allergens & Sensitivities",
  "Industry Codes",
];

export const lookupCategory = (code: string): PwaCategory | null => {
  return MAP[code] ?? null;
};
