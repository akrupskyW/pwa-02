import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";

import type { ScoredFood, Slot } from "@/lib/types";
import { withExpressionIds } from "@/store/api-urls";
import {
  type AiTagsState,
  MAX_SLOTS,
  assignCode,
  clearAiTags,
  hydrate,
  mergeFoodScores,
  removeCode,
  replaceSlots,
  seedSlot,
  setAiTags,
  setCurrentFood,
  setWeight,
} from "@/store/slices/preferences-slice";

import type { AppDispatch, RootState } from "@/store";

export const STORAGE_KEY_SLOTS = "pn.slots";
export const STORAGE_KEY_FOOD_ID = "pn.foodId";
export const STORAGE_KEY_AI_TAGS = "pn.aiTags";

const safeWrite = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota / privacy mode — silently ignore
  }
};

const safeRemove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

export const persistenceMiddleware = createListenerMiddleware();

// Persist slots whenever they change.
persistenceMiddleware.startListening({
  matcher: isAnyOf(assignCode, removeCode, setWeight, seedSlot, replaceSlots),
  effect: (_action, api) => {
    const state = api.getState() as RootState;
    if (!state.preferences.hydrated) return;
    safeWrite(STORAGE_KEY_SLOTS, JSON.stringify(state.preferences.slots));
  },
});

// Persist current food id whenever it changes.
persistenceMiddleware.startListening({
  matcher: isAnyOf(setCurrentFood, mergeFoodScores),
  effect: (_action, api) => {
    const state = api.getState() as RootState;
    if (!state.preferences.hydrated) return;
    const food = state.preferences.currentFood;
    if (food) safeWrite(STORAGE_KEY_FOOD_ID, food.foodId);
    else safeRemove(STORAGE_KEY_FOOD_ID);
  },
});

// Persist AI tags whenever they change.
persistenceMiddleware.startListening({
  matcher: isAnyOf(setAiTags, clearAiTags),
  effect: (_action, api) => {
    const state = api.getState() as RootState;
    if (!state.preferences.hydrated) return;
    const tags = state.preferences.aiTags;
    if (tags) safeWrite(STORAGE_KEY_AI_TAGS, JSON.stringify(tags));
    else safeRemove(STORAGE_KEY_AI_TAGS);
  },
});

/** Read persisted state from localStorage and dispatch the HYDRATE action.
 *  Safe to call only on the client. */
export const hydrateFromStorage = (dispatch: AppDispatch) => {
  const initialSlots: Slot[] = Array.from({ length: MAX_SLOTS }, () => ({
    expressionId: null,
    weight: 0,
  }));

  let slots: Slot[] = initialSlots;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw) as Slot[];
      if (Array.isArray(parsed) && parsed.length === MAX_SLOTS) {
        slots = parsed.map((s) => ({
          expressionId: s.expressionId ?? null,
          weight: typeof s.weight === "number" ? s.weight : 0,
        }));
      }
    }
  } catch {
    // ignore malformed payloads
  }

  let aiTags: AiTagsState | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_TAGS);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AiTagsState>;
      if (
        Array.isArray(parsed.tags) &&
        parsed.tags.every((t) => typeof t === "string") &&
        typeof parsed.signature === "string"
      ) {
        aiTags = { tags: parsed.tags, signature: parsed.signature };
      }
    }
  } catch {
    // ignore malformed payloads
  }

  let pendingFoodId: string | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FOOD_ID);
    if (raw && raw.trim()) pendingFoodId = raw;
  } catch {
    // ignore
  }

  // Phase 1 — synchronous: slots + AI tags land immediately so the UI
  // mounts without waiting on the network. currentFood stays null for now.
  dispatch(hydrate({ slots, currentFood: null, aiTags }));

  // Phase 2 — async: if there was a previously-viewed food, re-fetch it
  // against the just-hydrated slots' expressionIds and dispatch it once
  // the response lands. PROTOTYPE.md §3 calls for the "last viewed food"
  // to be restored on reload; storing just the ID keeps the payload tiny
  // (the rest of the ScoredFood — scores, label/color — has to be
  // recomputed against the user's current code selection anyway).
  if (pendingFoodId) {
    void restoreCurrentFood(pendingFoodId, slots, dispatch);
  }
};

const restoreCurrentFood = async (
  foodId: string,
  slots: readonly Slot[],
  dispatch: AppDispatch,
): Promise<void> => {
  const expressionIds = slots.map((s) => s.expressionId).filter((id): id is string => Boolean(id));
  const url = withExpressionIds(`/api/food/by-id/${foodId}`, expressionIds);

  try {
    const res = await fetch(url);
    if (res.status === 404) {
      // Food was deleted or the id is stale — clear it so we don't keep
      // re-trying on every reload.
      safeRemove(STORAGE_KEY_FOOD_ID);
      return;
    }
    if (!res.ok) return; // transient error; leave the id, try again next load
    const json = (await res.json()) as { food: ScoredFood | null };
    if (json.food) {
      dispatch(setCurrentFood({ food: json.food }));
    } else {
      safeRemove(STORAGE_KEY_FOOD_ID);
    }
  } catch {
    // Network failure (offline, etc.) — leave the stored id alone so the
    // restore is retried on the next reload.
  }
};
