"use client";

import { useCallback, useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";
import { ScoredFoodCard } from "./ScoredFoodCard";
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

// Scanner UI: typed UPC or live barcode scan via camera. The scanner is a
// dynamically-imported component (BarcodeScanner) so the ~250KB zxing chunk
// doesn't ship until the user actually opens the scanner.
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
      // Mirror the Blazor flow: run the lookup with the camera still open,
      // then transition straight from the camera frame to the result card
      // (or not-found / error state). Closing the scanner BEFORE the fetch
      // produces a jarring flash through the empty input + Look up button.
      setUpcInput(upc);
      await handleLookup(upc);
      setScanning(false);
    },
    [handleLookup],
  );

  const showInlineCard = !onAfterScan && state.currentFood;

  return (
    <div className="h-full flex flex-col relative">
      <header className="bg-gradient-to-b from-stage-800 to-stage-700 text-white px-5 pt-16 pb-5 text-center">
        <div className="text-[22px] font-extrabold tracking-tight">Scan a product</div>
        <div className="text-[13px] text-screen-subtle mt-1">Live weighted to your codes</div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="w-full rounded-xl bg-accent-gold text-stage-900 text-sm font-semibold py-3 flex items-center justify-center gap-2"
        >
          <span aria-hidden>📷</span>
          <span>Scan barcode</span>
        </button>

        <div className="flex items-center gap-2 text-[11px] text-screen-subtle uppercase tracking-wider">
          <div className="flex-1 h-px bg-screen-line" />
          <span>or enter UPC</span>
          <div className="flex-1 h-px bg-screen-line" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleLookup(upcInput);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0028400064057"
            value={upcInput}
            onChange={(e) => setUpcInput(e.target.value)}
            className="flex-1 rounded-xl bg-screen-card border border-screen-line px-3 py-2 text-sm placeholder:text-screen-subtle"
          />
          <button
            type="submit"
            disabled={lookingUp || !upcInput.trim()}
            className="rounded-xl bg-stage-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
          >
            {lookingUp ? "…" : "Look up"}
          </button>
        </form>

        {notFoundUpc && (
          <div className="text-center text-sm text-screen-subtle py-2">
            Barcode <strong className="text-white">{notFoundUpc}</strong> isn&apos;t in our food
            database.
          </div>
        )}
        {error && (
          <div className="text-center text-sm text-red-300 py-2">
            Something went wrong looking that up. Try again.
          </div>
        )}

        {showInlineCard ? (
          <ScoredFoodCard composite={composite} />
        ) : (
          <div className="text-center px-6 pt-12">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-screen-subtle text-sm">
              Scan a barcode, enter a UPC, or pick a food from the Browse tab.
            </div>
          </div>
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
