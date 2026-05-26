"use client";

import { useCallback, useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";
import { ScoredFoodCard } from "./ScoredFoodCard";
import { Icon } from "./Icon";
import {
  fetchFoodByUpc,
  useCodes,
  useDispatchHelpers,
  usePreferences,
} from "@/store/preferences-hooks";

interface Props {
  // Routed /scan page passes a callback that navigates to /food/[id]. When
  // set, the inline detail card is suppressed since the user is about to
  // leave for the dedicated detail view. The demo's third phone passes
  // nothing so the card renders inline below the scanner controls — that's
  // the side-by-side feedback-loop story.
  onAfterScan?: (foodId: string) => void;
}

export const ProductPhone = ({ onAfterScan }: Props) => {
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
    <div className="relative flex h-full flex-col">
      <header className="px-5 pt-14 pb-3">
        <div className="text-accent-emerald text-[11px] font-bold tracking-[0.16em]">SCAN</div>
        <div className="text-ink-bright mt-0.5 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">
          Find a food
        </div>
        <div className="text-ink-muted mt-1 text-[12px] font-medium">
          Live weighted to your code.
        </div>
      </header>

      <div className="flex-1 space-y-4 px-5 pb-5">
        {/* The hero "Scan" CTA — emerald gradient with a colored glow. */}
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="text-ink-soft shadow-cta-emerald flex w-full items-center justify-center gap-2.5 rounded-l py-4 text-[15px] font-extrabold"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent-emerald) 0%, var(--color-accent-teal) 100%)",
          }}
        >
          <Icon name="camera" size={20} strokeWidth={2.4} />
          <span>Scan a barcode</span>
        </button>

        <div className="text-ink-faint flex items-center gap-3 text-[10px] font-bold tracking-[0.16em] uppercase">
          <div className="bg-line h-px flex-1" />
          <span>or enter UPC</span>
          <div className="bg-line h-px flex-1" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLookup(upcInput);
          }}
          className="flex items-center gap-2"
        >
          <label className="bg-card border-line focus-within:border-line-strong flex flex-1 items-center gap-2 rounded-s border px-3 py-2.5">
            <Icon name="barcode" size={16} className="text-ink-muted" />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0028400064057"
              value={upcInput}
              onChange={(e) => setUpcInput(e.target.value)}
              className="placeholder:text-ink-faint text-ink-bright flex-1 bg-transparent font-mono text-[14px] tracking-[0.04em] outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={lookingUp || !upcInput.trim()}
            className="bg-surface-2 border-line text-ink-bright hover:bg-surface-3 rounded-s border px-4 py-2.5 text-[13px] font-bold transition disabled:opacity-50"
          >
            {lookingUp ? "…" : "Look up"}
          </button>
        </form>

        {notFoundUpc && (
          <div className="rounded-m bg-card border-line text-ink-muted border p-3 text-center text-[12px]">
            Barcode{" "}
            <strong className="text-ink-bright font-mono tracking-[0.04em]">{notFoundUpc}</strong>{" "}
            isn&apos;t in our food database.
          </div>
        )}
        {error && (
          <div className="rounded-m bg-card border-accent-rose/40 text-accent-rose border p-3 text-center text-[13px]">
            Something went wrong looking that up. Try again.
          </div>
        )}

        {showInlineCard ? <ScoredFoodCard composite={composite} /> : <EmptyHero />}
      </div>

      {scanning && (
        <BarcodeScanner onDetected={handleDetected} onCancel={() => setScanning(false)} />
      )}
    </div>
  );
};

const EmptyHero = () => {
  return (
    <div className="px-6 pt-8 text-center">
      <div className="bg-card border-line text-ink-muted mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-l border">
        <Icon name="scan-line" size={32} strokeWidth={1.6} />
      </div>
      <div className="text-ink-bright text-[14px] font-bold">Point and shoot</div>
      <div className="text-ink-muted mx-auto mt-1 max-w-[260px] text-[12px]">
        Scan a barcode, enter a UPC, or pick a food from the Browse tab to see how it scores against
        your code.
      </div>
    </div>
  );
};
