"use client";

import { useCallback, useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";
import { ScoredFoodCard } from "./ScoredFoodCard";
import { Icon } from "./Icon";
import {
  fetchFoodByUpc,
  useDispatchHelpers,
  usePreferences,
} from "@/state/preferences-context";
import { useCodes } from "@/state/codes-context";

interface Props {
  // Routed /scan page passes a callback that navigates to /food/[id]. When
  // set, the inline detail card is suppressed since the user is about to
  // leave for the dedicated detail view. The demo's third phone passes
  // nothing so the card renders inline below the scanner controls — that's
  // the side-by-side feedback-loop story.
  onAfterScan?: (foodId: string) => void;
}

export function ProductPhone({ onAfterScan }: Props) {
  const allCodes = useCodes();
  const { state, composite } = usePreferences();
  const { setCurrentFood } = useDispatchHelpers();

  const [upcInput, setUpcInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [notFoundUpc, setNotFoundUpc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleLookup = useCallback(
    async (rawUpc: string) => {
      const upc = rawUpc.trim();
      if (!upc) return;
      setLookingUp(true);
      setNotFoundUpc(null);
      setError(false);
      try {
        const expressionIds = allCodes.map((c) => c.id);
        const food = await fetchFoodByUpc(upc, expressionIds);
        if (!food) {
          setNotFoundUpc(upc);
          return;
        }
        setCurrentFood(food);
        onAfterScan?.(food.foodId);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLookingUp(false);
      }
    },
    [allCodes, setCurrentFood, onAfterScan],
  );

  const handleDetected = useCallback(
    async (upc: string) => {
      setUpcInput(upc);
      await handleLookup(upc);
      setScanning(false);
    },
    [handleLookup],
  );

  const showInlineCard = !onAfterScan && state.currentFood;

  return (
    <div className="h-full flex flex-col relative">
      <header className="px-5 pt-14 pb-3">
        <div className="text-[11px] font-bold tracking-[0.16em] text-accent-emerald">
          SCAN
        </div>
        <div className="text-[24px] font-extrabold tracking-[-0.02em] text-ink-bright leading-tight mt-0.5">
          Find a food
        </div>
        <div className="text-[12px] font-medium text-ink-muted mt-1">
          Live weighted to your code.
        </div>
      </header>

      <div className="flex-1 px-5 pb-5 space-y-4">
        {/* The hero "Scan" CTA — emerald gradient with a colored glow. */}
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="w-full rounded-l text-ink-soft text-[15px] font-extrabold py-4 flex items-center justify-center gap-2.5 shadow-cta-emerald"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-emerald) 0%, var(--accent-teal) 100%)",
          }}
        >
          <Icon name="camera" size={20} strokeWidth={2.4} />
          <span>Scan a barcode</span>
        </button>

        <div className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-[0.16em] text-ink-faint">
          <div className="flex-1 h-px bg-line" />
          <span>or enter UPC</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLookup(upcInput);
          }}
          className="flex items-center gap-2"
        >
          <label className="flex-1 flex items-center gap-2 rounded-s bg-card border border-line px-3 py-2.5 focus-within:border-border-strong">
            <Icon name="barcode" size={16} className="text-ink-muted" />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0028400064057"
              value={upcInput}
              onChange={(e) => setUpcInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[14px] font-mono tracking-[0.04em] placeholder:text-ink-faint text-ink-bright"
            />
          </label>
          <button
            type="submit"
            disabled={lookingUp || !upcInput.trim()}
            className="rounded-s bg-surface-2 border border-line text-ink-bright text-[13px] font-bold px-4 py-2.5 disabled:opacity-50 hover:bg-surface-3 transition"
          >
            {lookingUp ? "…" : "Look up"}
          </button>
        </form>

        {notFoundUpc && (
          <div className="rounded-m bg-card border border-line p-3 text-center text-[12px] text-ink-muted">
            Barcode{" "}
            <strong className="text-ink-bright font-mono tracking-[0.04em]">
              {notFoundUpc}
            </strong>{" "}
            isn&apos;t in our food database.
          </div>
        )}
        {error && (
          <div className="rounded-m bg-card border border-accent-rose/40 p-3 text-center text-[13px] text-accent-rose">
            Something went wrong looking that up. Try again.
          </div>
        )}

        {showInlineCard ? (
          <ScoredFoodCard composite={composite} />
        ) : (
          <EmptyHero />
        )}
      </div>

      {scanning && (
        <BarcodeScanner
          onDetected={handleDetected}
          onCancel={() => setScanning(false)}
        />
      )}
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="text-center px-6 pt-8">
      <div className="mx-auto w-16 h-16 rounded-l flex items-center justify-center bg-card border border-line text-ink-muted mb-3">
        <Icon name="scan-line" size={32} strokeWidth={1.6} />
      </div>
      <div className="text-ink-bright font-bold text-[14px]">Point and shoot</div>
      <div className="text-ink-muted text-[12px] mt-1 max-w-[260px] mx-auto">
        Scan a barcode, enter a UPC, or pick a food from the Browse tab to see
        how it scores against your code.
      </div>
    </div>
  );
}
