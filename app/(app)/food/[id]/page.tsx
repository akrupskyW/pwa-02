"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ScoredFoodCard } from "@/components/ScoredFoodCard";
import { useCodes } from "@/state/codes-context";
import {
  fetchFoodById,
  useDispatchHelpers,
  usePreferences,
} from "@/state/preferences-context";

type Status = "loading" | "ready" | "not-found" | "error";

// Deep-linkable food detail page. Entered from the Browse tab (tap a row) or
// the Scan tab (after a successful barcode/UPC lookup) — in both cases the
// food is already in context, so we render immediately. Direct visits and
// hard refreshes fetch the food by id from the API on mount.
export default function FoodDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
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
      <header className="bg-gradient-to-b from-stage-800 to-stage-700 text-white px-5 pt-16 pb-5 text-center">
        <div className="text-[22px] font-extrabold tracking-tight">Your score</div>
        <div className="text-[13px] text-screen-subtle mt-1">Personalized breakdown</div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {status === "loading" && (
          <div className="text-center px-6 pt-16 text-screen-subtle text-sm inline-flex items-center justify-center gap-2 w-full">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-full border-2 border-white/25 border-t-white animate-spin"
            />
            <span>Loading food…</span>
          </div>
        )}

        {status === "not-found" && (
          <EmptyState
            emoji="🤔"
            title="Food not found"
            body="We couldn't find that food in our database. It may have been removed."
          />
        )}

        {status === "error" && (
          <EmptyState
            emoji="⚠️"
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
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center px-6 pt-12">
      <div className="text-4xl mb-3">{emoji}</div>
      <div className="text-white font-semibold text-sm">{title}</div>
      <div className="text-screen-subtle text-sm mt-1">{body}</div>
      <div className="mt-5 flex gap-2 justify-center">
        <Link
          href="/browse"
          className="rounded-xl bg-stage-700 text-white text-sm font-semibold px-4 py-2"
        >
          Browse foods
        </Link>
        <Link
          href="/scan"
          className="rounded-xl bg-accent-gold text-stage-900 text-sm font-semibold px-4 py-2"
        >
          Scan a barcode
        </Link>
      </div>
    </div>
  );
}
