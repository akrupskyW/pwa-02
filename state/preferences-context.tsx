"use client";

// Scoped client-side state for the personalized scoring experience.
// Owns the user's slot config + current scanned/selected food, and persists
// to localStorage so reloads keep the user's preferences and last food.

import {
  createContext,
  Dispatch,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  applyWeightChange,
  autoEqualize,
  computeComposite,
} from "@/lib/composite";
import type {
  ScoredFood,
  SelectableExpression,
  Slot,
} from "@/lib/types";

export const MAX_SLOTS = 5;
const STORAGE_KEY_SLOTS = "pn.slots";
const STORAGE_KEY_FOOD_ID = "pn.foodId";
const STORAGE_KEY_AI_TAGS = "pn.aiTags";

interface AiTagsState {
  tags: string[];
  /** The slots signature the tags were generated against. When the current
   *  slots produce a different signature, the tags are "stale" and the UI
   *  shows an Ask-AI button instead of the chip row. */
  signature: string;
}

interface State {
  slots: Slot[];
  currentFood: ScoredFood | null;
  hydrated: boolean;
  aiTags: AiTagsState | null;
}

type Action =
  | { type: "HYDRATE"; slots: Slot[]; currentFood: ScoredFood | null; aiTags: AiTagsState | null }
  | { type: "ASSIGN_CODE"; slotIdx: number; expressionId: string }
  | { type: "REMOVE_CODE"; slotIdx: number }
  | { type: "SET_WEIGHT"; slotIdx: number; weight: number }
  | { type: "SEED_SLOT"; slotIdx: number; expressionId: string; weight: number }
  | { type: "REPLACE_SLOTS"; slots: Slot[] }
  | { type: "SET_CURRENT_FOOD"; food: ScoredFood | null }
  | { type: "MERGE_FOOD_SCORES"; foodId: string; scores: ScoredFood["scores"] }
  | { type: "SET_AI_TAGS"; tags: string[]; signature: string }
  | { type: "CLEAR_AI_TAGS" };

/** Stable signature of the user's filled slot config. Used to invalidate AI
 *  tags whenever the underlying portfolio changes (different code OR
 *  different weight) — the UI then shows the "Ask AI for new tags" button. */
export function slotsSignature(slots: readonly Slot[]): string {
  return JSON.stringify(
    slots
      .filter((s) => s.expressionId)
      .map((s) => [s.expressionId, s.weight] as const),
  );
}

const initialSlots: Slot[] = Array.from({ length: MAX_SLOTS }, () => ({
  expressionId: null,
  weight: 0,
}));

const initialState: State = {
  slots: initialSlots,
  currentFood: null,
  hydrated: false,
  aiTags: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return {
        slots: action.slots,
        currentFood: action.currentFood,
        hydrated: true,
        aiTags: action.aiTags,
      };

    case "ASSIGN_CODE": {
      // If this code is already in another slot, do nothing.
      if (
        state.slots.some(
          (s, i) => s.expressionId === action.expressionId && i !== action.slotIdx,
        )
      ) {
        return state;
      }
      const wasEmpty = !state.slots[action.slotIdx]?.expressionId;
      const next = state.slots.map((s, i) =>
        i === action.slotIdx ? { ...s, expressionId: action.expressionId } : s,
      );
      return { ...state, slots: wasEmpty ? autoEqualize(next) : next };
    }

    case "REMOVE_CODE": {
      const next = state.slots.map((s, i) =>
        i === action.slotIdx ? { expressionId: null, weight: 0 } : s,
      );
      return { ...state, slots: autoEqualize(next) };
    }

    case "SET_WEIGHT":
      return { ...state, slots: applyWeightChange(state.slots, action.slotIdx, action.weight) };

    case "SEED_SLOT": {
      const next = state.slots.map((s, i) =>
        i === action.slotIdx
          ? { expressionId: action.expressionId, weight: Math.max(0, Math.min(100, action.weight)) }
          : s,
      );
      return { ...state, slots: next };
    }

    case "REPLACE_SLOTS": {
      // Used by the AI compose flow: replace the entire slot config with
      // the model's choice, padding the tail with empty slots so we keep
      // exactly MAX_SLOTS entries.
      const filled = action.slots.slice(0, MAX_SLOTS);
      const padded: Slot[] = Array.from({ length: MAX_SLOTS }, (_, i) =>
        filled[i] ?? { expressionId: null, weight: 0 },
      );
      return { ...state, slots: padded };
    }

    case "SET_CURRENT_FOOD":
      return { ...state, currentFood: action.food };

    case "MERGE_FOOD_SCORES":
      if (!state.currentFood || state.currentFood.foodId !== action.foodId) return state;
      return {
        ...state,
        currentFood: {
          ...state.currentFood,
          scores: { ...state.currentFood.scores, ...action.scores },
        },
      };

    case "SET_AI_TAGS":
      return { ...state, aiTags: { tags: action.tags, signature: action.signature } };

    case "CLEAR_AI_TAGS":
      return { ...state, aiTags: null };
  }
}

interface ContextValue {
  state: State;
  dispatch: Dispatch<Action>;
  composite: number | null;
  filledCount: number;
  hasEmptySlot: boolean;
  emptySlotIndex: number;
  /** Current slot signature — recomputed on every state change so the AI
   *  layer can compare it to the signature stored alongside the tags. */
  currentSignature: string;
  /** True when AI tags exist but the slot config has changed since they
   *  were generated. The hero shows the "Ask AI for new tags" button. */
  aiTagsStale: boolean;
}

const PreferencesContext = createContext<ContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from localStorage exactly once on mount (client side).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    let slots = initialSlots;
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

    dispatch({ type: "HYDRATE", slots, currentFood: null, aiTags });
  }, []);

  // Auto-save slots to localStorage on any change after hydration.
  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_SLOTS, JSON.stringify(state.slots));
    } catch {
      // quota / privacy mode — silently ignore
    }
  }, [state.slots, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      if (state.currentFood) {
        localStorage.setItem(STORAGE_KEY_FOOD_ID, state.currentFood.foodId);
      } else {
        localStorage.removeItem(STORAGE_KEY_FOOD_ID);
      }
    } catch {
      // ignore
    }
  }, [state.currentFood, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      if (state.aiTags) {
        localStorage.setItem(STORAGE_KEY_AI_TAGS, JSON.stringify(state.aiTags));
      } else {
        localStorage.removeItem(STORAGE_KEY_AI_TAGS);
      }
    } catch {
      // ignore
    }
  }, [state.aiTags, state.hydrated]);

  const composite = useMemo(
    () => computeComposite(state.slots, state.currentFood),
    [state.slots, state.currentFood],
  );

  const filledCount = useMemo(
    () => state.slots.filter((s) => s.expressionId).length,
    [state.slots],
  );

  const emptySlotIndex = useMemo(
    () => state.slots.findIndex((s) => !s.expressionId),
    [state.slots],
  );

  const currentSignature = useMemo(
    () => slotsSignature(state.slots),
    [state.slots],
  );

  const aiTagsStale = Boolean(
    state.aiTags && state.aiTags.signature !== currentSignature,
  );

  const value = useMemo<ContextValue>(
    () => ({
      state,
      dispatch,
      composite,
      filledCount,
      hasEmptySlot: emptySlotIndex >= 0,
      emptySlotIndex,
      currentSignature,
      aiTagsStale,
    }),
    [state, composite, filledCount, emptySlotIndex, currentSignature, aiTagsStale],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): ContextValue {
  const v = useContext(PreferencesContext);
  if (!v) throw new Error("usePreferences must be used within a PreferencesProvider");
  return v;
}

// Seed default codes if no slots are filled after hydration. The first three
// active codes are typical "starter" picks.
export function useSeedDefaults(codes: SelectableExpression[]): void {
  const { state, dispatch, filledCount } = usePreferences();
  const seededRef = useRef(false);
  useEffect(() => {
    if (!state.hydrated || seededRef.current) return;
    if (filledCount > 0) {
      seededRef.current = true;
      return;
    }
    if (codes.length === 0) return;

    const defaults = ["heart_healthy", "clean_label", "wisecode_upf"];
    const picks = defaults
      .map((code) => codes.find((c) => c.code === code))
      .filter((c): c is SelectableExpression => Boolean(c))
      .slice(0, 3);

    if (picks.length === 0) return;
    const weights = [40, 30, 30];
    picks.forEach((p, i) =>
      dispatch({ type: "SEED_SLOT", slotIdx: i, expressionId: p.id, weight: weights[i] ?? 0 }),
    );
    seededRef.current = true;
  }, [codes, dispatch, filledCount, state.hydrated]);
}

// API helpers
const expressionIdsQuery = (ids: readonly string[]) =>
  ids.map((id) => `expressionId=${encodeURIComponent(id)}`).join("&");

export async function fetchFoodById(
  foodId: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> {
  const qs = expressionIdsQuery(expressionIds);
  const res = await fetch(`/api/food/by-id/${foodId}?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`food fetch failed: ${res.status}`);
  const json = (await res.json()) as { food: ScoredFood | null };
  return json.food;
}

export async function fetchFoodByUpc(
  upc: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> {
  const qs = expressionIdsQuery(expressionIds);
  const res = await fetch(`/api/food/by-upc/${encodeURIComponent(upc)}?${qs}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`upc lookup failed: ${res.status}`);
  const json = (await res.json()) as { food: ScoredFood | null };
  return json.food;
}

// Re-export the dispatch action constructors as small functions for ergonomics
// in components without exposing the reducer action shapes.
export function useDispatchHelpers() {
  const { dispatch } = usePreferences();
  return {
    assignCode: useCallback(
      (slotIdx: number, expressionId: string) =>
        dispatch({ type: "ASSIGN_CODE", slotIdx, expressionId }),
      [dispatch],
    ),
    removeCode: useCallback(
      (slotIdx: number) => dispatch({ type: "REMOVE_CODE", slotIdx }),
      [dispatch],
    ),
    setWeight: useCallback(
      (slotIdx: number, weight: number) =>
        dispatch({ type: "SET_WEIGHT", slotIdx, weight }),
      [dispatch],
    ),
    replaceSlots: useCallback(
      (slots: Slot[]) => dispatch({ type: "REPLACE_SLOTS", slots }),
      [dispatch],
    ),
    setCurrentFood: useCallback(
      (food: ScoredFood | null) => dispatch({ type: "SET_CURRENT_FOOD", food }),
      [dispatch],
    ),
    mergeFoodScores: useCallback(
      (foodId: string, scores: ScoredFood["scores"]) =>
        dispatch({ type: "MERGE_FOOD_SCORES", foodId, scores }),
      [dispatch],
    ),
    setAiTags: useCallback(
      (tags: string[], signature: string) =>
        dispatch({ type: "SET_AI_TAGS", tags, signature }),
      [dispatch],
    ),
    clearAiTags: useCallback(() => dispatch({ type: "CLEAR_AI_TAGS" }), [dispatch]),
  };
}
