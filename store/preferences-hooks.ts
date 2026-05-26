"use client";

import { useCallback, useEffect, useRef } from "react";

import type { ScoredFood, SelectableExpression, Slot } from "@/lib/types";
import { withExpressionIds } from "@/store/api-urls";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAiTagsStale,
  selectCodes,
  selectComposite,
  selectCurrentSignature,
  selectEmptySlotIndex,
  selectFilledCount,
} from "@/store/selectors";
import {
  assignCode as assignCodeAction,
  clearAiTags as clearAiTagsAction,
  mergeFoodScores as mergeFoodScoresAction,
  removeCode as removeCodeAction,
  replaceSlots as replaceSlotsAction,
  seedSlot as seedSlotAction,
  setAiTags as setAiTagsAction,
  setCurrentFood as setCurrentFoodAction,
  setWeight as setWeightAction,
} from "@/store/slices/preferences-slice";

/** Read-only accessor matching the old `usePreferences()` shape. State and
 *  derived values are sourced from the Redux store; consumers continue to
 *  see `state.slots`, `state.currentFood`, etc. */
export const usePreferences = () => {
  const state = useAppSelector((s) => s.preferences);
  const composite = useAppSelector(selectComposite);
  const filledCount = useAppSelector(selectFilledCount);
  const emptySlotIndex = useAppSelector(selectEmptySlotIndex);
  const currentSignature = useAppSelector(selectCurrentSignature);
  const aiTagsStale = useAppSelector(selectAiTagsStale);

  return {
    state,
    composite,
    filledCount,
    hasEmptySlot: emptySlotIndex >= 0,
    emptySlotIndex,
    currentSignature,
    aiTagsStale,
  };
};

/** Bound action creators matching the old `useDispatchHelpers()` shape. */
export const useDispatchHelpers = () => {
  const dispatch = useAppDispatch();
  return {
    assignCode: useCallback(
      (slotIdx: number, expressionId: string) =>
        dispatch(assignCodeAction({ slotIdx, expressionId })),
      [dispatch],
    ),
    removeCode: useCallback(
      (slotIdx: number) => dispatch(removeCodeAction({ slotIdx })),
      [dispatch],
    ),
    setWeight: useCallback(
      (slotIdx: number, weight: number) => dispatch(setWeightAction({ slotIdx, weight })),
      [dispatch],
    ),
    replaceSlots: useCallback(
      (slots: Slot[]) => dispatch(replaceSlotsAction({ slots })),
      [dispatch],
    ),
    setCurrentFood: useCallback(
      (food: ScoredFood | null) => dispatch(setCurrentFoodAction({ food })),
      [dispatch],
    ),
    mergeFoodScores: useCallback(
      (foodId: string, scores: ScoredFood["scores"]) =>
        dispatch(mergeFoodScoresAction({ foodId, scores })),
      [dispatch],
    ),
    setAiTags: useCallback(
      (tags: string[], signature: string) => dispatch(setAiTagsAction({ tags, signature })),
      [dispatch],
    ),
    clearAiTags: useCallback(() => dispatch(clearAiTagsAction()), [dispatch]),
  };
};

/** Codes catalog accessor (replaces the old `useCodes()` from CodesProvider). */
export const useCodes = (): SelectableExpression[] => useAppSelector(selectCodes);

/** Seed default codes if no slots are filled after hydration. */
export const useSeedDefaults = (codes: SelectableExpression[]): void => {
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector((s) => s.preferences.hydrated);
  const filledCount = useAppSelector(selectFilledCount);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!hydrated || seededRef.current) return;
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
      dispatch(seedSlotAction({ slotIdx: i, expressionId: p.id, weight: weights[i] ?? 0 })),
    );
    seededRef.current = true;
  }, [codes, dispatch, filledCount, hydrated]);
};

/** Memoized fetchers (data layer — not state). Kept here so consumers only
 *  import from the store module. URL shape is built via `withExpressionIds`
 *  so a request with an empty `expressionIds` array doesn't emit a trailing
 *  `?` (which fragments CDN caches and analytics keys for no reason). */

export const fetchFoodById = async (
  foodId: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> => {
  const url = withExpressionIds(`/api/food/by-id/${foodId}`, expressionIds);
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`food fetch failed: ${res.status}`);
  const json = (await res.json()) as { food: ScoredFood | null };
  return json.food;
};

export const fetchFoodByUpc = async (
  upc: string,
  expressionIds: readonly string[],
): Promise<ScoredFood | null> => {
  const url = withExpressionIds(`/api/food/by-upc/${encodeURIComponent(upc)}`, expressionIds);
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`upc lookup failed: ${res.status}`);
  const json = (await res.json()) as { food: ScoredFood | null };
  return json.food;
};

export { MAX_SLOTS, slotsSignature } from "@/store/slices/preferences-slice";
