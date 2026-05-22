"use client";

import { useCodes } from "@/state/codes-context";
import { usePreferences } from "@/state/preferences-context";

// Self-contained breakdown card for the currently selected food. Reads the
// food + slot config from context, and the composite is passed in by the
// caller (computed once at the page level). Used by both the routed
// /food/[id] page and the demo's third phone.
export function ScoredFoodCard({ composite }: { composite: number | null }) {
  const allCodes = useCodes();
  const { state } = usePreferences();
  const food = state.currentFood;
  if (!food) return null;

  return (
    <div className="space-y-4">
      <div className="bg-screen-card border border-screen-line rounded-2xl p-3 flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl bg-stage-700 overflow-hidden flex items-center justify-center flex-shrink-0">
          {food.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🥫</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold leading-snug">{food.name}</div>
          {food.brand && (
            <div className="text-[12px] text-screen-subtle mt-0.5">{food.brand}</div>
          )}
        </div>
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
