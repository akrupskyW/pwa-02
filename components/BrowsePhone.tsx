"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFoodById,
  useDispatchHelpers,
  usePreferences,
} from "@/state/preferences-context";
import type { BrowseFood, BrowsePage, SelectableExpression } from "@/lib/types";

const PAGE_SIZE = 20;

interface Props {
  allCodes: SelectableExpression[];
}

export function BrowsePhone({ allCodes }: Props) {
  const { state, filledCount } = usePreferences();
  const { setCurrentFood } = useDispatchHelpers();
  const [items, setItems] = useState<BrowseFood[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable representation of (expressionId, weight) so we only re-run the
  // initial fetch when the slot config materially changes.
  const slotsKey = useMemo(
    () =>
      JSON.stringify(
        state.slots
          .filter((s) => s.expressionId && s.weight > 0)
          .map((s) => [s.expressionId, s.weight]),
      ),
    [state.slots],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Build the slots payload for a fetch from current state.
  const buildSlotsPayload = useCallback(() => {
    return state.slots
      .filter((s) => s.expressionId && s.weight > 0)
      .map((s) => ({ expressionId: s.expressionId as string, weight: s.weight }));
  }, [state.slots]);

  // Initial / refresh fetch — runs when the slot config changes. Debounced
  // 400ms so slider drags coalesce into a single request. Always offset=0;
  // the list resets when slots change because the sort order changes.
  useEffect(() => {
    if (!state.hydrated) return;
    if (filledCount === 0) {
      setItems([]);
      setTotal(0);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoadingInitial(true);
      setError(null);
      try {
        const res = await fetch("/api/browse", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slots: buildSlotsPayload(),
            offset: 0,
            limit: PAGE_SIZE,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`browse failed: ${res.status}`);
        const page = (await res.json()) as BrowsePage;
        setItems(page.items);
        setTotal(page.total);
        // Scroll the inner container back to the top — sort order changed.
        scrollRef.current?.scrollTo({ top: 0 });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        setError("Couldn't load foods. Try again.");
      } finally {
        if (!controller.signal.aborted) setLoadingInitial(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slotsKey, state.hydrated, filledCount, buildSlotsPayload]);

  // Fetch the next page. Append to items.
  const fetchMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await fetch("/api/browse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slots: buildSlotsPayload(),
          offset: items.length,
          limit: PAGE_SIZE,
        }),
      });
      if (!res.ok) throw new Error(`browse next failed: ${res.status}`);
      const page = (await res.json()) as BrowsePage;
      // De-dup by foodId in case a row shifts page boundaries between fetches
      // (different slot ordering can rearrange the tail).
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.foodId));
        const fresh = page.items.filter((it) => !seen.has(it.foodId));
        return [...prev, ...fresh];
      });
      setTotal(page.total);
    } catch (err) {
      console.error(err);
      // Soft failure on subsequent pages — keep what we have, no banner.
    } finally {
      setLoadingMore(false);
    }
  }, [buildSlotsPayload, items.length]);

  // IntersectionObserver against the sentinel at the bottom of the list.
  // Fires when the sentinel approaches the viewport (rootMargin 200px) so the
  // next page starts loading before the user actually hits the end.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!scrollEl || !sentinel) return;
    if (items.length === 0) return;
    if (items.length >= total) return;
    if (loadingInitial || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchMore();
      },
      { root: scrollEl, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, total, loadingInitial, loadingMore, fetchMore]);

  const handleSelect = useCallback(
    async (food: BrowseFood) => {
      try {
        const expressionIds = allCodes.map((c) => c.id);
        const scored = await fetchFoodById(food.foodId, expressionIds);
        if (scored) setCurrentFood(scored);
      } catch (err) {
        console.error(err);
      }
    },
    [allCodes, setCurrentFood],
  );

  const hasMore = items.length < total;

  return (
    <div className="h-full flex flex-col">
      <header className="bg-gradient-to-b from-stage-800 to-stage-700 text-white px-5 pt-16 pb-5 text-center">
        <div className="text-[22px] font-extrabold tracking-tight">Browse foods</div>
        <div className="text-[13px] text-screen-subtle mt-1 inline-flex items-center justify-center gap-2">
          {loadingInitial ? (
            <>
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white/25 border-t-white animate-spin"
              />
              <span>Loading Data</span>
            </>
          ) : total > 0 ? (
            <span>
              Sorted by your personal score · {items.length.toLocaleString()} of{" "}
              {total.toLocaleString()}
            </span>
          ) : (
            <span>Sorted by your personal score</span>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-2">
        {filledCount === 0 && (
          <div className="text-center px-6 pt-20">
            <div className="text-4xl mb-3">🧩</div>
            <div className="text-screen-subtle text-sm">
              Add at least one code on the left to see ranked foods here.
            </div>
          </div>
        )}

        {filledCount > 0 && error && (
          <div className="text-center text-sm text-red-300 px-4 pt-8">{error}</div>
        )}

        {filledCount > 0 &&
          items.map((food) => {
            const isCurrent = state.currentFood?.foodId === food.foodId;
            return (
              <button
                key={food.foodId}
                type="button"
                onClick={() => handleSelect(food)}
                className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  isCurrent
                    ? "border-accent-gold bg-accent-gold/10"
                    : "border-screen-line bg-screen-card hover:bg-screen-card/70"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-stage-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {food.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={food.imageUrl}
                      alt={food.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🍽️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{food.name}</div>
                  {food.brand && (
                    <div className="text-[12px] text-screen-subtle truncate">{food.brand}</div>
                  )}
                </div>
                <div className="text-lg font-bold tabular-nums">
                  {Math.min(100, food.composite)}
                </div>
              </button>
            );
          })}

        {/* Sentinel + loader. Observed by IntersectionObserver to trigger the
            next-page fetch. Stays in the DOM until items.length === total. */}
        {filledCount > 0 && hasMore && (
          <div
            ref={sentinelRef}
            className="py-4 flex items-center justify-center text-screen-subtle text-xs"
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block w-2.5 h-2.5 rounded-full border-2 border-white/25 border-t-white animate-spin"
                />
                Loading more…
              </span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        )}

        {filledCount > 0 && items.length > 0 && !hasMore && (
          <div className="py-3 text-center text-screen-subtle text-[11px]">
            End of list
          </div>
        )}
      </div>
    </div>
  );
}
