import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { applyWeightChange, autoEqualize } from "@/lib/composite";
import type { ScoredFood, Slot } from "@/lib/types";

export const MAX_SLOTS = 5;

export interface AiTagsState {
  tags: string[];
  /** The slots signature the tags were generated against. When the current
   *  slots produce a different signature, the tags are "stale" and the UI
   *  shows an Ask-AI button instead of the chip row. */
  signature: string;
}

export interface PreferencesState {
  slots: Slot[];
  currentFood: ScoredFood | null;
  hydrated: boolean;
  aiTags: AiTagsState | null;
}

const initialSlots: Slot[] = Array.from({ length: MAX_SLOTS }, () => ({
  expressionId: null,
  weight: 0,
}));

const initialState: PreferencesState = {
  slots: initialSlots,
  currentFood: null,
  hydrated: false,
  aiTags: null,
};

/** Stable signature of the user's filled slot config. Used to invalidate AI
 *  tags whenever the underlying portfolio changes. */
export const slotsSignature = (slots: readonly Slot[]): string =>
  JSON.stringify(
    slots.filter((s) => s.expressionId).map((s) => [s.expressionId, s.weight] as const),
  );

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    hydrate: (
      state,
      action: PayloadAction<{
        slots: Slot[];
        currentFood: ScoredFood | null;
        aiTags: AiTagsState | null;
      }>,
    ) => {
      state.slots = action.payload.slots;
      state.currentFood = action.payload.currentFood;
      state.aiTags = action.payload.aiTags;
      state.hydrated = true;
    },

    assignCode: (state, action: PayloadAction<{ slotIdx: number; expressionId: string }>) => {
      const { slotIdx, expressionId } = action.payload;
      // If this code is already in another slot, do nothing.
      if (state.slots.some((s, i) => s.expressionId === expressionId && i !== slotIdx)) {
        return;
      }
      const wasEmpty = !state.slots[slotIdx]?.expressionId;
      const next = state.slots.map((s, i) => (i === slotIdx ? { ...s, expressionId } : s));
      state.slots = wasEmpty ? autoEqualize(next) : next;
    },

    removeCode: (state, action: PayloadAction<{ slotIdx: number }>) => {
      const next = state.slots.map((s, i) =>
        i === action.payload.slotIdx ? { expressionId: null, weight: 0 } : s,
      );
      state.slots = autoEqualize(next);
    },

    setWeight: (state, action: PayloadAction<{ slotIdx: number; weight: number }>) => {
      state.slots = applyWeightChange(state.slots, action.payload.slotIdx, action.payload.weight);
    },

    seedSlot: (
      state,
      action: PayloadAction<{ slotIdx: number; expressionId: string; weight: number }>,
    ) => {
      const { slotIdx, expressionId, weight } = action.payload;
      state.slots = state.slots.map((s, i) =>
        i === slotIdx ? { expressionId, weight: Math.max(0, Math.min(100, weight)) } : s,
      );
    },

    replaceSlots: (state, action: PayloadAction<{ slots: Slot[] }>) => {
      // Used by the AI compose flow: replace the entire slot config and pad
      // the tail with empty slots so we keep exactly MAX_SLOTS entries.
      const filled = action.payload.slots.slice(0, MAX_SLOTS);
      state.slots = Array.from(
        { length: MAX_SLOTS },
        (_, i) => filled[i] ?? { expressionId: null, weight: 0 },
      );
    },

    setCurrentFood: (state, action: PayloadAction<{ food: ScoredFood | null }>) => {
      state.currentFood = action.payload.food;
    },

    mergeFoodScores: (
      state,
      action: PayloadAction<{ foodId: string; scores: ScoredFood["scores"] }>,
    ) => {
      if (!state.currentFood || state.currentFood.foodId !== action.payload.foodId) return;
      state.currentFood.scores = { ...state.currentFood.scores, ...action.payload.scores };
    },

    setAiTags: (state, action: PayloadAction<{ tags: string[]; signature: string }>) => {
      state.aiTags = { tags: action.payload.tags, signature: action.payload.signature };
    },

    clearAiTags: (state) => {
      state.aiTags = null;
    },
  },
});

export const {
  hydrate,
  assignCode,
  removeCode,
  setWeight,
  seedSlot,
  replaceSlots,
  setCurrentFood,
  mergeFoodScores,
  setAiTags,
  clearAiTags,
} = preferencesSlice.actions;

export default preferencesSlice.reducer;
