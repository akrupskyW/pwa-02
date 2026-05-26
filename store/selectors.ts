import { createSelector } from "@reduxjs/toolkit";

import { computeComposite } from "@/lib/composite";
import { slotsSignature } from "@/store/slices/preferences-slice";

import type { RootState } from "@/store";

export const selectSlots = (state: RootState) => state.preferences.slots;
export const selectCurrentFood = (state: RootState) => state.preferences.currentFood;
export const selectHydrated = (state: RootState) => state.preferences.hydrated;
export const selectAiTags = (state: RootState) => state.preferences.aiTags;
export const selectCodes = (state: RootState) => state.codes.catalog;

export const selectComposite = createSelector([selectSlots, selectCurrentFood], (slots, food) =>
  computeComposite(slots, food),
);

export const selectFilledCount = createSelector(
  [selectSlots],
  (slots) => slots.filter((s) => s.expressionId).length,
);

export const selectEmptySlotIndex = createSelector([selectSlots], (slots) =>
  slots.findIndex((s) => !s.expressionId),
);

export const selectCurrentSignature = createSelector([selectSlots], (slots) =>
  slotsSignature(slots),
);

export const selectAiTagsStale = createSelector(
  [selectAiTags, selectCurrentSignature],
  (tags, sig) => Boolean(tags && tags.signature !== sig),
);
