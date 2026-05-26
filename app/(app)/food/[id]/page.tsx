"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScoredFoodCard } from "@/components/ScoredFoodCard";
import { Icon, type IconName } from "@/components/Icon";
import {
  fetchFoodById,
  useCodes,
  useDispatchHelpers,
  usePreferences,
} from "@/store/preferences-hooks";

type Status = "loading" | "ready" | "not-found" | "error";

// Deep-linkable food detail page. Composes the breakdown card and frames it
// with the screen header (SCAN RESULT / Product Detail) per DESIGN.md §3,
// Phone 3.
const FoodDetailPage = () => {
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
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pt-14 pb-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="bg-surface-2 border-line text-ink hover:text-ink-bright flex h-9 w-9 items-center justify-center rounded-s border"
          >
            <Icon name="arrow-left" size={16} strokeWidth={2.2} />
          </button>
          <div>
            <div className="text-accent-emerald text-[10px] font-bold tracking-[0.16em]">
              SCAN RESULT
            </div>
            <div className="text-ink-bright text-[14px] leading-tight font-bold">
              Product Detail
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Share"
            className="bg-surface-2 border-line text-ink hover:text-ink-bright flex h-9 w-9 items-center justify-center rounded-s border"
          >
            <Icon name="share" size={15} />
          </button>
          <button
            type="button"
            aria-label="Bookmark"
            className="bg-surface-2 border-line text-ink hover:text-ink-bright flex h-9 w-9 items-center justify-center rounded-s border"
          >
            <Icon name="bookmark" size={15} />
          </button>
        </div>
      </header>

      <div className="flex-1 px-5 pb-5">
        {status === "loading" && (
          <div className="text-ink-muted inline-flex w-full items-center justify-center gap-2 px-6 pt-16 text-center text-sm">
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/25 border-t-white"
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
};

export default FoodDetailPage;

const EmptyState = ({ icon, title, body }: { icon: IconName; title: string; body: string }) => {
  return (
    <div className="px-6 pt-12 text-center">
      <div className="bg-card border-line text-ink-muted mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-l border">
        <Icon name={icon} size={28} />
      </div>
      <div className="text-ink-bright text-[15px] font-bold">{title}</div>
      <div className="text-ink-muted mt-1 text-[13px]">{body}</div>
      <div className="mt-5 flex justify-center gap-2">
        <Link
          href="/browse"
          className="rounded-pill bg-surface-2 border-line text-ink hover:bg-surface-3 border px-4 py-2 text-[13px] font-bold transition"
        >
          Browse foods
        </Link>
        <Link
          href="/scan"
          className="rounded-pill text-ink-soft shadow-cta-emerald px-4 py-2 text-[13px] font-extrabold"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent-emerald) 0%, var(--color-accent-teal) 100%)",
          }}
        >
          Scan a barcode
        </Link>
      </div>
    </div>
  );
};
