// Pure helpers for composite scoring and slot-weight rebalancing.
// Mirrors the WISEintelligence prototype's PwaPreferenceState behavior so
// the math is consistent across UI and DB.

import type { Slot, ScoredFood } from "./types";

/**
 * Composite for a single scored food against a slot config.
 * Re-normalizes over slots that actually have a score on the food
 * (the "missing-score policy a"). Returns null when no slot contributes.
 */
export const computeComposite = (
  slots: readonly Slot[],
  food: ScoredFood | null,
): number | null => {
  if (!food) return null;
  let weighted = 0;
  let weightSum = 0;
  for (const slot of slots) {
    if (!slot.expressionId) continue;
    const entry = food.scores[slot.expressionId];
    if (!entry) continue;
    weighted += entry.score * slot.weight;
    weightSum += slot.weight;
  }
  return weightSum > 0 ? Math.round(weighted / weightSum) : null;
};

/**
 * Apply a weight change to a slot, redistributing across the OTHER filled
 * slots so the visible integers still sum to 100. Returns a new Slot[]; the
 * input array is not mutated.
 *
 * Algorithm matches the prototype's PwaPreferenceState.SetWeight:
 *   - delta = newWeight - oldWeight
 *   - if delta > 0 and others sum to 0, reject (can't take from nothing)
 *   - if delta > otherTotal, zero everyone else and pin this slot
 *     to oldWeight + otherTotal
 *   - otherwise reduce others proportionally; even-split fallback when
 *     decreasing while others are all zero
 *   - normalize rounding so the integer sum returns to exactly 100
 */
export const applyWeightChange = (
  slots: readonly Slot[],
  slotIdx: number,
  newWeight: number,
): Slot[] => {
  const next = slots.map((s) => ({ ...s }));

  if (slotIdx < 0 || slotIdx >= next.length) return next;
  if (!next[slotIdx]!.expressionId) return next;

  const filledCount = next.filter((s) => s.expressionId).length;
  if (filledCount <= 1) return next; // single slot locked at 100%

  newWeight = Math.max(0, Math.min(100, newWeight));
  const oldWeight = next[slotIdx]!.weight;
  const delta = newWeight - oldWeight;
  if (delta === 0) return next;

  const others = next
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => s.expressionId !== null && i !== slotIdx);
  const otherTotal = others.reduce((sum, { s }) => sum + s.weight, 0);

  if (otherTotal === 0 && delta > 0) return next; // nothing to take from

  let actualNewWeight: number;
  if (delta > otherTotal) {
    // Can't take more than others have. Zero them and pin this slot.
    actualNewWeight = oldWeight + otherTotal;
    for (const { i } of others) next[i]!.weight = 0;
  } else {
    // Proportional reduction. Even split when otherTotal === 0 and delta < 0.
    actualNewWeight = newWeight;
    for (const { s, i } of others) {
      const prop = otherTotal > 0 ? s.weight / otherTotal : 1 / others.length;
      next[i]!.weight = Math.max(0, Math.round(s.weight - delta * prop));
    }
  }
  next[slotIdx]!.weight = Math.round(actualNewWeight);

  // Rounding fix: make integer sum exactly 100 by tweaking the biggest other.
  const total = next.filter((s) => s.expressionId).reduce((a, s) => a + s.weight, 0);
  if (total !== 100 && others.length > 0) {
    const biggest = others.reduce((a, b) => (next[a.i]!.weight >= next[b.i]!.weight ? a : b));
    next[biggest.i]!.weight = Math.max(0, next[biggest.i]!.weight + (100 - total));
  }

  return next;
};

/**
 * Even-split the filled slots so their weights sum to 100. Used when a code
 * is added or removed.
 */
export const autoEqualize = (slots: readonly Slot[]): Slot[] => {
  const next = slots.map((s) => ({ ...s }));
  const filledIndices = next
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.expressionId)
    .map(({ i }) => i);

  if (filledIndices.length === 0) {
    for (const s of next) s.weight = 0;
    return next;
  }

  const baseW = Math.floor(100 / filledIndices.length);
  const remainder = 100 - baseW * filledIndices.length;

  for (let pos = 0; pos < filledIndices.length; pos++) {
    const i = filledIndices[pos]!;
    next[i]!.weight = baseW + (pos === 0 ? remainder : 0);
  }
  // Zero out unfilled slots.
  for (const s of next) if (!s.expressionId) s.weight = 0;
  return next;
};
