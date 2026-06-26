"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFoodById,
  useCodes,
  useDispatchHelpers,
  usePreferences,
} from "@/store/preferences-hooks";
import { identityForCode, tierColor } from "@/lib/code-identity";
import { Icon, type IconName } from "./Icon";
import type { BrowseFood, BrowsePage, SelectableExpression } from "@/lib/types";

const PAGE_SIZE = 20;

interface Props {
  // Called after a food is loaded into context. Used by the routed app to
  // push to /food/[id]; left undefined in the side-by-side demo where the
  // breakdown is already visible on the next phone.
  onAfterSelect?: (foodId: string) => void;
}

export const BrowsePhone = ({ onAfterSelect }: Props) => {
  const allCodes = useCodes();
  const { state, filledCount } = usePreferences();
  const { setCurrentFood } = useDispatchHelpers();
  const [items, setItems] = useState<BrowseFood[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const buildSlotsPayload = useCallback(() => {
    return state.slots
      .filter((s) => s.expressionId && s.weight > 0)
      .map((s) => ({ expressionId: s.expressionId as string, weight: s.weight }));
  }, [state.slots]);

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
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.foodId));
        const fresh = page.items.filter((it) => !seen.has(it.foodId));
        return [...prev, ...fresh];
      });
      setTotal(page.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [buildSlotsPayload, items.length]);

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
        if (scored) {
          setCurrentFood(scored);
          onAfterSelect?.(scored.foodId);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [allCodes, setCurrentFood, onAfterSelect],
  );

  const hasMore = items.length < total;
  const featured = items[0] ?? null;
  const rest = items.slice(1);

  return (
    <div ref={scrollRef} className="no-scrollbar h-full overflow-y-auto">
      <ScreenHeader loading={loadingInitial} />

      <div className="space-y-4 px-5 pb-5">
        <ActiveCodesChips />

        {filledCount === 0 && <EmptyConfig />}

        {filledCount > 0 && error && (
          <div className="rounded-m bg-card border-line text-accent-rose border p-3 text-center text-[13px]">
            {error}
          </div>
        )}

        {filledCount > 0 && featured && (
          <FeaturedCard
            food={featured}
            slots={state.slots}
            allCodes={allCodes}
            isCurrent={state.currentFood?.foodId === featured.foodId}
            onClick={() => handleSelect(featured)}
          />
        )}

        {filledCount > 0 && rest.length > 0 && (
          <div>
            <div className="flex items-end justify-between px-0.5 pb-2">
              <div className="text-ink-muted text-[11px] font-bold tracking-[0.14em]">
                ALL RESULTS · {total.toLocaleString()}
              </div>
              <div className="text-ink flex items-center gap-1 text-[10px] font-bold tracking-[0.06em]">
                Best Match
                <Icon name="chevron-down" size={11} strokeWidth={2.2} />
              </div>
            </div>

            <ul className="space-y-2">
              {rest.map((food) => (
                <FoodRow
                  key={food.foodId}
                  food={food}
                  slots={state.slots}
                  allCodes={allCodes}
                  isCurrent={state.currentFood?.foodId === food.foodId}
                  onClick={() => handleSelect(food)}
                />
              ))}
            </ul>
          </div>
        )}

        {filledCount > 0 && hasMore && (
          <div
            ref={sentinelRef}
            className="text-ink-faint flex items-center justify-center py-3 text-xs"
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/25 border-t-white"
                />
                Loading more…
              </span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        )}

        {filledCount > 0 && items.length > 0 && !hasMore && (
          <div className="text-ink-faint py-3 text-center text-[11px] tracking-[0.06em]">
            End of list
          </div>
        )}
      </div>
    </div>
  );
};

const ScreenHeader = ({ loading }: { loading: boolean }) => {
  return (
    <header className="flex items-start justify-between px-5 pt-14 pb-3">
      <div>
        <div className="text-accent-violet inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.16em]">
          BROWSE
          {loading && (
            <span
              aria-hidden
              className="bg-accent-violet animate-pulse-dot inline-block h-2 w-2 rounded-full"
            />
          )}
        </div>
        <div className="text-ink-bright mt-0.5 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">
          Top Matches
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          className="bg-surface-2 border-line text-ink hover:text-ink-bright flex h-[38px] w-[38px] items-center justify-center rounded-s border"
        >
          <Icon name="search" size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Filter"
          className="bg-surface-2 border-line text-ink hover:text-ink-bright flex h-[38px] w-[38px] items-center justify-center rounded-s border"
        >
          <Icon name="sliders-horizontal" size={18} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

const ActiveCodesChips = () => {
  const { state } = usePreferences();
  const allCodes = useCodes();
  const filled = state.slots.filter((s) => s.expressionId);
  if (filled.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {filled.map((slot) => {
        const code = allCodes.find((c) => c.id === slot.expressionId);
        if (!code) return null;
        const id = identityForCode(code.code);
        return (
          <span
            key={slot.expressionId}
            className="rounded-pill bg-surface border-line text-ink inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold tracking-[0.04em]"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: id.c1, boxShadow: `0 0 6px ${id.c1}AA` }}
            />
            {shortName(code.name)} {slot.weight}
          </span>
        );
      })}
    </div>
  );
};

const shortName = (name: string) => {
  // Trim multi-word names down for the chip row.
  return name.split(" ").slice(0, 2).join(" ");
};

const EmptyConfig = () => {
  return (
    <div className="px-6 pt-12 text-center">
      <div className="bg-card border-line text-ink-muted mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-l border">
        <Icon name="puzzle" size={28} />
      </div>
      <div className="text-ink text-[14px] font-bold">No code yet</div>
      <div className="text-ink-muted mt-1 text-[12px]">
        Add at least one code on the Code tab to see ranked foods here.
      </div>
    </div>
  );
};

interface RowProps {
  food: BrowseFood;
  slots: { expressionId: string | null; weight: number }[];
  allCodes: SelectableExpression[];
  isCurrent: boolean;
  onClick: () => void;
}

const FeaturedCard = ({ food, slots, allCodes, isCurrent, onClick }: RowProps) => {
  const composite = Math.min(100, food.composite);
  const filled = slots.filter((s) => s.expressionId);

  // Per-slot icon for the thumbnail. Use the top-weighted slot.
  const topSlot = [...filled].sort((a, b) => b.weight - a.weight)[0];
  const topCode = topSlot ? allCodes.find((c) => c.id === topSlot.expressionId) : null;
  const topId = topCode ? identityForCode(topCode.code) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full space-y-3 rounded-l p-4 text-left transition"
      style={{
        background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-card) 100%)",
        border: `1px solid ${isCurrent ? "rgba(50,169,102,0.55)" : "rgba(50,169,102,0.35)"}`,
        boxShadow: "0 12px 32px -8px rgba(50,169,102,0.18)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-[84px] w-[84px] flex-shrink-0 items-center justify-center overflow-hidden rounded-l"
          style={
            food.imageUrl
              ? undefined
              : topId
                ? { background: `linear-gradient(135deg, ${topId.c1} 0%, ${topId.c2} 100%)` }
                : { background: "linear-gradient(135deg, #32A966, #245E3B)" }
          }
        >
          {food.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={food.imageUrl} alt={food.name} className="h-full w-full object-cover" />
          ) : topId ? (
            <span className="text-ink-soft">
              <Icon name={topId.icon as IconName} size={34} strokeWidth={2.2} />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="rounded-pill bg-accent-emerald text-ink-soft inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold tracking-[0.08em]">
            <Icon name="crown" size={10} strokeWidth={2.4} />
            TOP MATCH
          </div>
          <div className="text-ink-bright mt-1.5 line-clamp-2 text-[15px] leading-tight font-bold">
            {food.name}
          </div>
          {food.brand && (
            <div className="text-ink-muted mt-0.5 truncate text-[11px] font-medium">
              {food.brand}
            </div>
          )}
        </div>

        <MiniRing value={composite} />
      </div>

      <ContributionMeter food={food} slots={filled} allCodes={allCodes} />
    </button>
  );
};

const MiniRing = ({ value }: { value: number }) => {
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const arc = c * 0.97 * pct;
  const gap = c - arc;
  return (
    <div className="relative h-16 w-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden>
        <defs>
          <linearGradient id="featured-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#32A966" />
            <stop offset="50%" stopColor="#245E3B" />
            <stop offset="100%" stopColor="#587896" />
          </linearGradient>
        </defs>
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--color-track)" strokeWidth={6} />
        <circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          stroke="url(#featured-ring)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${gap}`}
          transform={`rotate(-90 32 32)`}
        />
      </svg>
      <div className="text-ink-bright absolute inset-0 flex items-center justify-center text-[22px] font-extrabold tracking-[-0.02em] tabular-nums">
        {Math.round(value)}
      </div>
    </div>
  );
};

const ContributionMeter = ({
  food,
  slots,
  allCodes,
}: {
  food: BrowseFood;
  slots: { expressionId: string | null; weight: number }[];
  allCodes: SelectableExpression[];
}) => {
  const totalWeight = slots.reduce((acc, s) => acc + s.weight, 0) || 1;
  return (
    <div className="flex gap-1">
      {slots.map((slot) => {
        const code = allCodes.find((c) => c.id === slot.expressionId);
        if (!code) return null;
        const id = identityForCode(code.code);
        const score = food.scores[code.id]?.score;
        const fraction = slot.weight / totalWeight;
        return (
          <div
            key={slot.expressionId as string}
            className="flex flex-col items-center gap-1"
            style={{ flex: `${fraction} ${fraction} 0%` }}
          >
            <div
              className="rounded-pill h-1.5 w-full"
              style={{
                background: `linear-gradient(90deg, ${id.c1} 0%, ${id.c2} 100%)`,
              }}
            />
            <div className="text-ink-muted text-[10px] font-bold tabular-nums">{score ?? "—"}</div>
          </div>
        );
      })}
    </div>
  );
};

const FoodRow = ({ food, slots, allCodes, isCurrent, onClick }: RowProps) => {
  const composite = Math.min(100, food.composite);
  const filled = slots.filter((s) => s.expressionId);
  const topSlot = [...filled].sort((a, b) => b.weight - a.weight)[0];
  const topCode = topSlot ? allCodes.find((c) => c.id === topSlot.expressionId) : null;
  const topId = topCode ? identityForCode(topCode.code) : null;

  // Per-code dot strip + present-count badge (DESIGN.md §3, Phone 2 rows).
  const presentCount = filled.reduce(
    (acc, s) => (s.expressionId && food.scores[s.expressionId]?.score != null ? acc + 1 : acc),
    0,
  );

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          "rounded-m flex w-full items-center gap-3 p-3 text-left transition",
          isCurrent
            ? "bg-card-elevated border-accent-emerald/50 border"
            : "bg-card border-line hover:bg-card-elevated border",
        ].join(" ")}
      >
        <div
          className="flex h-[54px] w-[54px] flex-shrink-0 items-center justify-center overflow-hidden rounded-s"
          style={
            food.imageUrl
              ? undefined
              : topId
                ? { background: `linear-gradient(135deg, ${topId.c1} 0%, ${topId.c2} 100%)` }
                : { background: "linear-gradient(135deg, #245E3B, #587896)" }
          }
        >
          {food.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={food.imageUrl} alt={food.name} className="h-full w-full object-cover" />
          ) : topId ? (
            <span className="text-ink-soft">
              <Icon name={topId.icon as IconName} size={24} strokeWidth={2.2} />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-ink-bright truncate text-[13px] leading-tight font-bold">
            {food.name}
          </div>
          {food.brand && (
            <div className="text-ink-muted mt-0.5 truncate text-[10px] font-medium">
              {food.brand}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1">
            {filled.slice(0, 5).map((slot) => {
              const code = allCodes.find((c) => c.id === slot.expressionId);
              if (!code) return null;
              const id = identityForCode(code.code);
              return (
                <span
                  key={slot.expressionId as string}
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: id.c1 }}
                />
              );
            })}
            <span className="text-ink-faint ml-1 text-[9px] font-semibold">
              {presentCount} codes match
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <div
            className="text-[26px] leading-none font-extrabold tracking-[-0.02em] tabular-nums"
            style={{ color: tierColor(composite) }}
          >
            {composite}
          </div>
          <div className="rounded-pill bg-ink-soft border-line text-ink-muted inline-flex items-center gap-1 border px-1.5 py-0.5 text-[8px] font-bold tracking-[0.04em]">
            <Icon
              name="check-check"
              size={9}
              strokeWidth={2.4}
              style={{ color: tierColor(composite) }}
            />
            {presentCount}/{filled.length}
          </div>
        </div>
      </button>
    </li>
  );
};
