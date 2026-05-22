// Curated mapping of food_expressions.code → consumer-facing picker section.
// Mirrors the WISEintelligence prototype's PwaCategoryMap. Codes outside this
// map are excluded from the picker so the consumer surface stays curated.
//
// Adding new picker sections is just adding entries here; nothing else needs
// to change. The picker modal groups by category automatically.

export type PwaCategory =
  | "Diet & Lifestyle"
  | "Allergies & Sensitivities"
  | "Health Goals"
  | "Clean Eating"
  | "Nutrient Focus"
  | "Special Conditions"
  | "Industry Codes"
  | "Other";

/**
 * code → display category. Update as new codes are added to wisecode_app.food_expressions.
 */
const MAP: Readonly<Record<string, PwaCategory>> = {
  // Diet & Lifestyle
  vegan: "Diet & Lifestyle",
  vegetarian: "Diet & Lifestyle",
  pescatarian: "Diet & Lifestyle",
  kosher: "Diet & Lifestyle",
  halal: "Diet & Lifestyle",
  paleo: "Diet & Lifestyle",
  keto: "Diet & Lifestyle",
  mediterranean: "Diet & Lifestyle",

  // Allergies & Sensitivities
  allergen_dairy: "Allergies & Sensitivities",
  allergen_eggs: "Allergies & Sensitivities",
  allergen_fish: "Allergies & Sensitivities",
  allergen_peanuts: "Allergies & Sensitivities",
  allergen_sesame: "Allergies & Sensitivities",
  allergen_shellfish: "Allergies & Sensitivities",
  allergen_soy: "Allergies & Sensitivities",
  allergen_tree_nuts: "Allergies & Sensitivities",
  allergen_wheat: "Allergies & Sensitivities",
  gluten_free: "Allergies & Sensitivities",
  dairy_free: "Allergies & Sensitivities",

  // Health Goals
  heart_healthy: "Health Goals",
  diabetic_friendly: "Health Goals",
  low_sodium: "Health Goals",
  weight_management: "Health Goals",
  anti_inflammatory: "Health Goals",
  gut_health: "Health Goals",

  // Clean Eating
  clean_label: "Clean Eating",
  all_natural: "Clean Eating",
  organic: "Clean Eating",
  non_gmo: "Clean Eating",
  artificial_color: "Clean Eating",
  artificial_flavor: "Clean Eating",
  artificial_sweetener: "Clean Eating",
  preservative_free: "Clean Eating",

  // Nutrient Focus
  high_protein: "Nutrient Focus",
  high_fiber: "Nutrient Focus",
  low_sugar: "Nutrient Focus",
  whole_grain: "Nutrient Focus",
  added_sugar: "Nutrient Focus",

  // Special Conditions
  wisecode_upf: "Special Conditions",
  ultra_processed: "Special Conditions",

  // Industry Codes
  guiding_stars: "Industry Codes",
};

export const PWA_CATEGORY_ORDER: readonly PwaCategory[] = [
  "Diet & Lifestyle",
  "Health Goals",
  "Clean Eating",
  "Nutrient Focus",
  "Allergies & Sensitivities",
  "Special Conditions",
  "Industry Codes",
  "Other",
];

export function lookupCategory(code: string): PwaCategory | null {
  return MAP[code] ?? null;
}
