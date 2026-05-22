"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScoredFoodCard } from "@/components/ScoredFoodCard";
import { Icon, type IconName } from "@/components/Icon";
import { useCodes } from "@/state/codes-context";
import {
  fetchFoodById,
  useDispatchHelpers,
  usePreferences,
} from "@/state/preferences-context";

type Status = "loading" | "ready" | "not-found" | "error";

// Deep-linkable food detail page. Composes the breakdown card and frames it
// with the screen header (SCAN RESULT / Product Detail) per DESIGN.md §3,
// Phone 3.
export default function FoodDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const allCodes = useCodes();
  const { state, composite } = usePreferences();
  const { setCurrentFood } = useDispatchHelpers();

  const [status, setStatus] = useState<Status>(
    state.currentFood?.foodId === id ? "ready" : "loading",
  );

  useEffect(() => {
    if (!id) return;
    if (state.currentFood?.foodId === id) {
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const expressionIds = allCodes.map((c) => c.id);
        const food = await fetchFoodById(id, expressionIds);
        if (cancelled) return;
        if (!food) {
          setStatus("not-found");
          return;
        }
        setCurrentFood(food);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, allCodes, state.currentFood?.foodId, setCurrentFood]);

  return (
    <div className="h-full flex flex-col">
      <header className="px-5 pt-14 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="w-9 h-9 rounded-s bg-surface-2 border border-line flex items-center justify-center text-ink hover:text-ink-bright"
          >
            <Icon name="arrow-left" size={16} strokeWidth={2.2} />
          </button>
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] text-accent-emerald">
              SCAN RESULT
            </div>
            <div className="text-[14px] font-bold text-ink-bright leading-tight">
              Product Detail
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Share"
            className="w-9 h-9 rounded-s bg-surface-2 border border-line flex items-center justify-center text-ink hover:text-ink-bright"
          >
            <Icon name="share" size={15} />
          </button>
          <button
            type="button"
            aria-label="Bookmark"
            className="w-9 h-9 rounded-s bg-surface-2 border border-line flex items-center justify-center text-ink hover:text-ink-bright"
          >
            <Icon name="bookmark" size={15} />
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 pb-5">
        {status === "loading" && (
          <div className="text-center px-6 pt-16 text-ink-muted text-sm inline-flex items-center justify-center gap-2 w-full">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-full border-2 border-white/25 border-t-white animate-spin"
            />
            <span>Loading food…</span>
          </div>
        )}

        {status === "not-found" && (
          <EmptyState
            icon="frown"
            title="Food not found"
            body="We couldn't find that food in our database. It may have been removed."
          />
        )}

        {status === "error" && (
          <EmptyState
            icon="alert-triangle"
            title="Something went wrong"
            body="Couldn't load this food right now. Try again in a moment."
          />
        )}

        {status === "ready" && <ScoredFoodCard composite={composite} />}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center px-6 pt-12">
      <div className="mx-auto w-14 h-14 rounded-l flex items-center justify-center bg-card border border-line text-ink-muted mb-3">
        <Icon name={icon} size={28} />
      </div>
      <div className="text-ink-bright font-bold text-[15px]">{title}</div>
      <div className="text-ink-muted text-[13px] mt-1">{body}</div>
      <div className="mt-5 flex gap-2 justify-center">
        <Link
          href="/browse"
          className="rounded-pill bg-surface-2 border border-line text-ink text-[13px] font-bold px-4 py-2 hover:bg-surface-3 transition"
        >
          Browse foods
        </Link>
        <Link
          href="/scan"
          className="rounded-pill text-ink-soft text-[13px] font-extrabold px-4 py-2 shadow-cta-emerald"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-emerald) 0%, var(--accent-teal) 100%)",
          }}
        >
          Scan a barcode
        </Link>
      </div>
    </div>
  );
}
