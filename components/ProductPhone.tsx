"use client";

import { useCallback, useState } from "react";
import { BarcodeScanner } from "./BarcodeScanner";
import {
  fetchFoodByUpc,
  useDispatchHelpers,
  usePreferences,
} from "@/state/preferences-context";
import type { SelectableExpression } from "@/lib/types";

interface Props {
  allCodes: SelectableExpression[];
}

// Lookup modes: typed UPC or live barcode scan via camera. The scanner is a
// dynamically-imported component (BarcodeScanner) so the ~250KB zxing chunk
// doesn't ship until the user actually opens the scanner.
export function ProductPhone({ allCodes }: Props) {
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
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLookingUp(false);
      }
    },
    [allCodes, setCurrentFood],
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

        {state.currentFood ? (
          <ScoredFoodCard composite={composite} allCodes={allCodes} />
        ) : (
          <div className="text-center px-6 pt-12">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-screen-subtle text-sm">
              Scan a barcode, enter a UPC, or pick a food from the Browse list to see its score.
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

function ScoredFoodCard({
  composite,
  allCodes,
}: {
  composite: number | null;
  allCodes: SelectableExpression[];
}) {
  const { state } = usePreferences();
  const food = state.currentFood;
  if (!food) return null;

  return (
    <div className="space-y-4">
      <div className="bg-screen-card border border-screen-line rounded-2xl p-4 text-center">
        <div className="w-24 h-24 mx-auto rounded-2xl bg-stage-700 overflow-hidden flex items-center justify-center mb-3">
          {food.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">🥫</span>
          )}
        </div>
        <div className="font-semibold leading-snug">{food.name}</div>
        {food.brand && <div className="text-[12px] text-screen-subtle mt-0.5">{food.brand}</div>}
      </div>

      <div className="text-center">
        <div className="text-[11px] uppercase tracking-wider text-screen-subtle">
          Your personalized score
        </div>
        <div className="text-6xl font-extrabold tabular-nums leading-none mt-1">
          {composite ?? "--"}
        </div>
        <div className="text-[11px] tracking-wider text-screen-subtle mt-1">OUT OF 100</div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-screen-subtle mb-2">
          Score breakdown
        </div>
        <div className="space-y-1.5">
          {state.slots
            .map((slot, i) => ({ slot, i }))
            .filter(({ slot }) => slot.expressionId)
            .map(({ slot }) => {
              const code = allCodes.find((c) => c.id === slot.expressionId);
              if (!code) return null;
              const entry = food.scores[slot.expressionId as string];
              const hasScore = Boolean(entry);
              const contribution = hasScore ? (entry!.score * slot.weight) / 100 : null;
              return (
                <div
                  key={slot.expressionId as string}
                  className="flex items-start gap-2 rounded-xl bg-screen-card/60 border border-screen-line p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{code.name}</span>
                      {hasScore && entry!.label && (
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 text-white"
                          style={{ background: entry!.color ?? "#475569" }}
                        >
                          {entry!.label}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-screen-subtle mt-0.5 tabular-nums">
                      {hasScore
                        ? `${entry!.score} × ${slot.weight}% = ${contribution!.toFixed(1)}`
                        : `No score on this food · ${slot.weight}% weight`}
                    </div>
                  </div>
                  <div className="text-sm font-bold tabular-nums ml-2">
                    {hasScore ? entry!.score : "—"}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
