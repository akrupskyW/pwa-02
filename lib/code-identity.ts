// Per-code visual identity — gradient + lucide-style icon name + tier label.
//
// This is the runtime equivalent of the gradient palette table in DESIGN.md
// §1 "Accent gradients". A code's identity is intentionally a *pair* of
// colors, not a single color: the brand reads as gradients across the entire
// product.
//
// New codes default to the Clean (emerald → teal) identity, which is the
// brand-default and works well against the dark surface. Override here when
// adding a code that has a distinct conceptual identity.

import { lookupCategory, type PwaCategory } from "./category-map";

export interface CodeIdentity {
  /** Gradient start color (also used as the dominant tier color). */
  c1: string;
  /** Gradient end color. */
  c2: string;
  /** lucide icon name. See https://lucide.dev for the catalog. */
  icon: string;
}

const VITAL: CodeIdentity = { c1: "#FF5E92", c2: "#FF9A2A", icon: "heart-pulse" };
const CLEAN: CodeIdentity = { c1: "#34E5A6", c2: "#22D3C5", icon: "sparkles" };
const PLANT: CodeIdentity = { c1: "#7C7CFB", c2: "#C44CD4", icon: "leaf" };
const MACRO: CodeIdentity = { c1: "#F5C14E", c2: "#FF9A2A", icon: "dumbbell" };
const HYDRO: CodeIdentity = { c1: "#5DCFFF", c2: "#3B82F6", icon: "droplets" };

// Per-code overrides. Codes not listed fall back to the category default.
const CODE_OVERRIDES: Readonly<Record<string, CodeIdentity>> = {
  // Health Outcomes — vital rose→amber
  heart_healthy: { ...VITAL, icon: "heart-pulse" },
  diabetes_friendly: { ...VITAL, icon: "activity" },
  gut_health: { ...VITAL, icon: "circle-dot" },
  muscle_health: { ...MACRO, icon: "dumbbell" },
  anti_inflammatory: { ...VITAL, icon: "flame" },

  // Composite Scores
  wise_score: { c1: "#F5C14E", c2: "#34E5A6", icon: "crown" },
  thrive_score: { c1: "#34E5A6", c2: "#5DCFFF", icon: "sparkles" },

  // Overall Quality
  iq_score: { ...CLEAN, icon: "brain" },
  nq_score: { ...CLEAN, icon: "shield-check" },
  carb_quality: { ...MACRO, icon: "wheat" },
  fat_quality: { ...MACRO, icon: "droplet" },

  // Nutrient Focus
  protein_density: { ...MACRO, icon: "dumbbell" },
  fiber_density: { ...PLANT, icon: "sprout" },
  sugar_density: { ...VITAL, icon: "candy" },
  calorie_quality: { ...MACRO, icon: "flame" },
  eaa_9: { ...MACRO, icon: "atom" },
  excellent_source: { ...CLEAN, icon: "star" },

  // Processing Level — plant violet→magenta
  wisecode_upf: { ...PLANT, icon: "leaf" },
  non_upf_vs_upf: { ...PLANT, icon: "leaf" },
  nova_food_classification_system: { ...PLANT, icon: "layers" },
  california_ab_1264_upf: { ...PLANT, icon: "scale" },
  texas_sb_25_upf: { ...PLANT, icon: "scale" },
  tx_sb25: { ...PLANT, icon: "scale" },

  // Clean & Natural — emerald
  clean_label: { ...CLEAN, icon: "sparkles" },
  all_natural: { ...CLEAN, icon: "feather" },
  gras_plus: { ...CLEAN, icon: "badge-check" },
  sketchy: { ...VITAL, icon: "alert-triangle" },
  maha: { ...CLEAN, icon: "leaf" },

  // Avoid Ingredients — vital rose→amber (warning identity)
  high_fructose_corn_syrup: { ...VITAL, icon: "ban" },
  artificial_sweetener: { ...VITAL, icon: "ban" },
  artificial_preservative: { ...VITAL, icon: "ban" },
  artificial_color: { ...VITAL, icon: "palette" },
  artificial_flavor: { ...VITAL, icon: "ban" },
  seed_oil: { ...VITAL, icon: "droplet" },
  hateful_eight_seed_oil: { ...VITAL, icon: "droplet" },
  emulsifier: { ...VITAL, icon: "blend" },
  watchout: { ...VITAL, icon: "eye" },
  hyperpalatability: { ...VITAL, icon: "zap" },

  // Allergens — hydro cyan→blue
  allergen: { ...HYDRO, icon: "shield-alert" },
  allergen_milk: { ...HYDRO, icon: "milk" },
  allergen_eggs: { ...HYDRO, icon: "egg" },
  allergen_peanuts: { ...HYDRO, icon: "nut" },
  allergen_tree_nuts: { ...HYDRO, icon: "nut" },
  allergen_soybeans: { ...HYDRO, icon: "bean" },
  allergen_wheat: { ...HYDRO, icon: "wheat" },
  allergen_fish: { ...HYDRO, icon: "fish" },
  allergen_shellfish: { ...HYDRO, icon: "shell" },
  allergen_sesame: { ...HYDRO, icon: "circle-dot" },
  histamine_level: { ...HYDRO, icon: "activity" },

  // Industry / third-party
  guiding_stars: { ...CLEAN, icon: "star" },
};

const CATEGORY_DEFAULT: Readonly<Record<PwaCategory, CodeIdentity>> = {
  "Composite Scores": { c1: "#F5C14E", c2: "#34E5A6", icon: "crown" },
  "Health Outcomes": VITAL,
  "Overall Quality": CLEAN,
  "Nutrient Focus": MACRO,
  "Processing Level": PLANT,
  "Clean & Natural": CLEAN,
  "Avoid Ingredients": VITAL,
  "Allergens & Sensitivities": HYDRO,
  "Industry Codes": CLEAN,
};

export function identityForCode(code: string): CodeIdentity {
  const override = CODE_OVERRIDES[code];
  if (override) return override;
  const category = lookupCategory(code);
  if (category) return CATEGORY_DEFAULT[category];
  return CLEAN;
}

// Pure-CSS conic angular gradient between c1 and c2 — used on the small
// per-slot mini-rings on the food card.
export function arcGradient(id: CodeIdentity): string {
  return `linear-gradient(135deg, ${id.c1} 0%, ${id.c2} 100%)`;
}

// Returns the tier color name for the per-row score readout. The displayed
// composite is colored by tier — see DESIGN.md §1 "Score tiers".
export function tierColor(score: number): string {
  if (score >= 90) return "var(--score-excellent)";
  if (score >= 75) return "var(--score-good)";
  if (score >= 60) return "var(--score-fair)";
  if (score >= 40) return "var(--score-low)";
  return "var(--score-poor)";
}
