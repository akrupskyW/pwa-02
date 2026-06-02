"use client";

import { useCodes, usePreferences } from "@/store/preferences-hooks";
import { identityForCode, tierColor } from "@/lib/code-identity";
import { ScoreRing } from "./ScoreRing";
import { Icon, type IconName } from "./Icon";

// Per-food breakdown — DESIGN.md §3, Phone 3 ("Product Detail").
// The composite is computed once at the page level and passed in here.
export const ScoredFoodCard = ({ composite }: { composite: number | null }) => {
  const allCodes = useCodes();
  const { state } = usePreferences();
  const food = state.currentFood;
  if (!food) return null;

  const shown = composite ?? 0;
  const filledSlots = state.slots.filter((s) => s.expressionId);
  const topSlot = [...filledSlots].sort((a, b) => b.weight - a.weight)[0];
  const topCode = topSlot ? allCodes.find((c) => c.id === topSlot.expressionId) : null;
  const topId = topCode ? identityForCode(topCode.code) : null;

  // "Verdict" — derived purely from the composite tier. The big number on the
  // ring is colored white, but the verdict line picks up the tier color so
  // there's redundant signal.
  const verdict =
    composite == null
      ? { label: "No data yet", icon: "frown", color: "var(--color-ink-muted)" }
      : composite >= 90
        ? {
            label: "Excellent match for your code",
            icon: "check-circle",
            color: "var(--color-accent-blue)",
          }
        : composite >= 75
          ? {
              label: "Good match for your code",
              icon: "check-circle",
              color: "var(--color-score-good)",
            }
          : composite >= 60
            ? { label: "Fair match for your code", icon: "check", color: "var(--color-score-fair)" }
            : {
                label: "Below your code's bar",
                icon: "alert-triangle",
                color: "var(--color-score-low)",
              };

  return (
    <div className="space-y-3">
      <section
        className="space-y-4 rounded-l p-4"
        style={{
          background:
            "linear-gradient(135deg, var(--color-card-elevated) 0%, var(--color-card) 100%)",
          border: "1px solid var(--color-line)",
          boxShadow: "0 12px 32px -8px rgba(52,229,166,0.22)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="rounded-m flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden"
            style={
              food.imageUrl
                ? undefined
                : topId
                  ? { background: `linear-gradient(135deg, ${topId.c1} 0%, ${topId.c2} 100%)` }
                  : { background: "linear-gradient(135deg, #5DCFFF, #7C7CFB)" }
            }
          >
            {food.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={food.imageUrl} alt={food.name} className="h-full w-full object-cover" />
            ) : topId ? (
              <span className="text-ink-soft">
                <Icon name={topId.icon as IconName} size={30} strokeWidth={2.2} />
              </span>
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-ink-bright line-clamp-2 text-[16px] leading-tight font-extrabold tracking-[-0.01em]">
              {food.name}
            </div>
            {food.brand && (
              <div className="text-ink-muted mt-0.5 truncate text-[11px] font-medium">
                {food.brand}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <ScoreRing
            value={shown}
            size={200}
            thicknessRatio={0.14}
            numberSize={Math.round(200 * 0.39)}
            display={composite == null ? "—" : undefined}
            label="COMPOSITE"
          />
          <div
            className="mt-3 inline-flex items-center gap-2 text-[12px] font-bold"
            style={{ color: verdict.color }}
          >
            <Icon name={verdict.icon as IconName} size={14} strokeWidth={2.4} />
            {verdict.label}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between px-0.5 pt-1">
        <div className="text-ink-muted text-[11px] font-bold tracking-[0.14em]">THE MATH</div>
        <div className="text-ink-faint text-[10px] font-medium tracking-[0.03em]">
          score × weight = contribution
        </div>
      </div>

      <div className="space-y-2">
        {state.slots
          .map((slot, i) => ({ slot, i }))
          .filter(({ slot }) => slot.expressionId)
          .map(({ slot }) => {
            const code = allCodes.find((c) => c.id === slot.expressionId);
            if (!code) return null;
            const entry = food.scores[slot.expressionId as string];
            const hasScore = Boolean(entry);
            const id = identityForCode(code.code);
            const contribution = hasScore ? (entry!.score * slot.weight) / 100 : null;
            return (
              <div
                key={slot.expressionId as string}
                className="rounded-m space-y-2 p-3"
                style={{
                  background: "rgba(15,23,41,0.9)",
                  border: "1px solid var(--color-line)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-ink-soft flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-s"
                    style={{
                      background: `linear-gradient(135deg, ${id.c1} 0%, ${id.c2} 100%)`,
                    }}
                  >
                    <Icon name={id.icon as IconName} size={14} strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-ink-bright truncate text-[12px] font-bold">
                        {code.name}
                      </span>
                      {hasScore && entry!.label && (
                        <span
                          className="rounded-pill px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.06em] uppercase"
                          style={{
                            background: `linear-gradient(90deg, ${id.c1}33 0%, ${id.c2}33 100%)`,
                            color: id.c1,
                            border: `1px solid ${id.c1}55`,
                          }}
                        >
                          {entry!.label}
                        </span>
                      )}
                    </div>
                    <div className="text-ink-muted mt-0.5 text-[10px] font-semibold tabular-nums">
                      {hasScore
                        ? `${entry!.score} × ${slot.weight}% = ${contribution!.toFixed(1)}`
                        : `No score on this food · ${slot.weight}% weight`}
                    </div>
                  </div>
                  <div
                    className="text-[22px] leading-none font-extrabold tracking-[-0.02em] tabular-nums"
                    style={{ color: hasScore ? tierColor(entry!.score) : "var(--color-ink-faint)" }}
                  >
                    {hasScore ? entry!.score : "—"}
                  </div>
                </div>

                <div className="rounded-pill bg-track-subtle h-1.5 overflow-hidden">
                  {hasScore && (
                    <div
                      className="rounded-pill h-full"
                      style={{
                        width: `${entry!.score}%`,
                        background: `linear-gradient(90deg, ${id.c1} 0%, ${id.c2} 100%)`,
                        boxShadow: `0 0 8px ${id.c1}66`,
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
