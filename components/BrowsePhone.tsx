"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchFoodById,
  useDispatchHelpers,
  usePreferences,
} from "@/state/preferences-context";
import { useCodes } from "@/state/codes-context";
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

export function BrowsePhone({ onAfterSelect }: Props) {
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
    <div ref={scrollRef} className="h-full overflow-y-auto no-scrollbar">
      <ScreenHeader loading={loadingInitial} />

      <div className="px-5 pb-5 space-y-4">
        <ActiveCodesChips />

        {filledCount === 0 && <EmptyConfig />}

        {filledCount > 0 && error && (
          <div className="rounded-m bg-card border border-line p-3 text-center text-[13px] text-accent-rose">
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
              <div className="text-[11px] font-bold tracking-[0.14em] text-ink-muted">
                ALL RESULTS · {total.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold tracking-[0.06em] text-ink">
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
            className="py-3 flex items-center justify-center text-ink-faint text-xs"
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
          <div className="py-3 text-center text-ink-faint text-[11px] tracking-[0.06em]">
            End of list
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenHeader({ loading }: { loading: boolean }) {
  return (
    <header className="px-5 pt-14 pb-3 flex items-start justify-between">
      <div>
        <div className="text-[11px] font-bold tracking-[0.16em] text-accent-violet inline-flex items-center gap-2">
          BROWSE
          {loading && (
            <span
              aria-hidden
              className="inline-block w-2 h-2 rounded-full bg-accent-violet animate-pulse-dot"
            />
          )}
        </div>
        <div className="text-[24px] font-extrabold tracking-[-0.02em] text-ink-bright leading-tight mt-0.5">
          Top Matches
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Search"
          className="w-[38px] h-[38px] rounded-s bg-surface-2 border border-line flex items-center justify-center text-ink hover:text-ink-bright"
        >
          <Icon name="search" size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Filter"
          className="w-[38px] h-[38px] rounded-s bg-surface-2 border border-line flex items-center justify-center text-ink hover:text-ink-bright"
        >
          <Icon name="sliders-horizontal" size={18} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

function ActiveCodesChips() {
  const { state } = usePreferences();
  const allCodes = useCodes();
  const filled = state.slots.filter((s) => s.expressionId);
  if (filled.length === 0) return null;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {filled.map((slot) => {
        const code = allCodes.find((c) => c.id === slot.expressionId);
        if (!code) return null;
        const id = identityForCode(code.code);
        return (
          <span
            key={slot.expressionId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-surface border border-line text-ink text-[10px] font-bold tracking-[0.04em]"
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: id.c1, boxShadow: `0 0 6px ${id.c1}AA` }}
            />
            {shortName(code.name)} {slot.weight}
          </span>
        );
      })}
    </div>
  );
}

function shortName(name: string) {
  // Trim multi-word names down for the chip row.
  return name.split(" ").slice(0, 2).join(" ");
}

function EmptyConfig() {
  return (
    <div className="text-center px-6 pt-12">
      <div className="mx-auto w-14 h-14 rounded-l flex items-center justify-center bg-card border border-line mb-3 text-ink-muted">
        <Icon name="puzzle" size={28} />
      </div>
      <div className="text-ink font-bold text-[14px]">No code yet</div>
      <div className="text-ink-muted text-[12px] mt-1">
        Add at least one code on the Code tab to see ranked foods here.
      </div>
    </div>
  );
}

interface RowProps {
  food: BrowseFood;
  slots: { expressionId: string | null; weight: number }[];
  allCodes: SelectableExpression[];
  isCurrent: boolean;
  onClick: () => void;
}

function FeaturedCard({ food, slots, allCodes, isCurrent, onClick }: RowProps) {
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
      className="w-full text-left rounded-l p-4 space-y-3 transition"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-2) 0%, var(--card) 100%)",
        border: `1px solid ${isCurrent ? "rgba(52,229,166,0.55)" : "rgba(52,229,166,0.35)"}`,
        boxShadow: "0 12px 32px -8px rgba(52,229,166,0.22)",
      }}
    >
      <div className="flex items-center gap-3.5">
        <div
          className="w-[84px] h-[84px] rounded-l flex items-center justify-center overflow-hidden flex-shrink-0"
          style={
            food.imageUrl
              ? undefined
              : topId
              ? { background: `linear-gradient(135deg, ${topId.c1} 0%, ${topId.c2} 100%)` }
              : { background: "linear-gradient(135deg, #34E5A6, #22D3C5)" }
          }
        >
          {food.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={food.imageUrl}
              alt={food.name}
              className="w-full h-full object-cover"
            />
          ) : topId ? (
            <span className="text-ink-soft">
              <Icon name={topId.icon as IconName} size={34} strokeWidth={2.2} />
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill bg-accent-emerald text-ink-soft text-[9px] font-extrabold tracking-[0.08em]">
            <Icon name="crown" size={10} strokeWidth={2.4} />
            TOP MATCH
          </div>
          <div className="text-[15px] font-bold text-ink-bright leading-tight mt-1.5 line-clamp-2">
            {food.name}
          </div>
          {food.brand && (
            <div className="text-[11px] font-medium text-ink-muted truncate mt-0.5">
              {food.brand}
            </div>
          )}
        </div>

        <MiniRing value={composite} />
      </div>

      <ContributionMeter
        food={food}
        slots={filled}
        allCodes={allCodes}
      />
    </button>
  );
}

function MiniRing({ value }: { value: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const arc = c * 0.97 * pct;
  const gap = c - arc;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" width={64} height={64} aria-hidden>
        <defs>
          <linearGradient id="featured-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34E5A6" />
            <stop offset="50%" stopColor="#22D3C5" />
            <stop offset="100%" stopColor="#5DCFFF" />
          </linearGradient>
        </defs>
        <circle cx={32} cy={32} r={r} fill="none" stroke="var(--track)" strokeWidth={6} />
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
      <div className="absolute inset-0 flex items-center justify-center text-[22px] font-extrabold tabular-nums tracking-[-0.02em] text-ink-bright">
        {Math.round(value)}
      </div>
    </div>
  );
}

function ContributionMeter({
  food,
  slots,
  allCodes,
}: {
  food: BrowseFood;
  slots: { expressionId: string | null; weight: number }[];
  allCodes: SelectableExpression[];
}) {
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
            className="flex flex-col gap-1 items-center"
            style={{ flex: `${fraction} ${fraction} 0%` }}
          >
            <div
              className="h-1.5 w-full rounded-pill"
              style={{
                background: `linear-gradient(90deg, ${id.c1} 0%, ${id.c2} 100%)`,
              }}
            />
            <div className="text-[10px] font-bold tabular-nums text-ink-muted">
              {score ?? "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FoodRow({ food, slots, allCodes, isCurrent, onClick }: RowProps) {
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
          "w-full flex items-center gap-3 rounded-m p-3 text-left transition",
          isCurrent
            ? "bg-card-elevated border border-accent-emerald/50"
            : "bg-card border border-line hover:bg-card-elevated",
        ].join(" ")}
      >
        <div
          className="w-[54px] h-[54px] rounded-s flex items-center justify-center overflow-hidden flex-shrink-0"
          style={
            food.imageUrl
              ? undefined
              : topId
              ? { background: `linear-gradient(135deg, ${topId.c1} 0%, ${topId.c2} 100%)` }
              : { background: "linear-gradient(135deg, #22D3C5, #5DCFFF)" }
          }
        >
          {food.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" />
          ) : topId ? (
            <span className="text-ink-soft">
              <Icon name={topId.icon as IconName} size={24} strokeWidth={2.2} />
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-ink-bright truncate leading-tight">
            {food.name}
          </div>
          {food.brand && (
            <div className="text-[10px] font-medium text-ink-muted truncate mt-0.5">
              {food.brand}
            </div>
          )}
          <div className="flex items-center gap-1 mt-1">
            {filled.slice(0, 5).map((slot) => {
              const code = allCodes.find((c) => c.id === slot.expressionId);
              if (!code) return null;
              const id = identityForCode(code.code);
              return (
                <span
                  key={slot.expressionId as string}
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: id.c1 }}
                />
              );
            })}
            <span className="text-[9px] font-semibold text-ink-faint ml-1">
              {presentCount} codes match
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div
            className="text-[26px] font-extrabold tabular-nums tracking-[-0.02em] leading-none"
            style={{ color: tierColor(composite) }}
          >
            {composite}
          </div>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-pill bg-ink-soft border border-line text-[8px] font-bold tracking-[0.04em] text-ink-muted">
            <Icon name="check-check" size={9} strokeWidth={2.4} style={{ color: tierColor(composite) }} />
            {presentCount}/{filled.length}
          </div>
        </div>
      </button>
    </li>
  );
}
