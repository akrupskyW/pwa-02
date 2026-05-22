"use client";

import { useMemo } from "react";
import { PWA_CATEGORY_ORDER } from "@/lib/category-map";
import { identityForCode } from "@/lib/code-identity";
import { usePreferences, useDispatchHelpers } from "@/state/preferences-context";
import { Icon, type IconName } from "./Icon";
import type { SelectableExpression } from "@/lib/types";

interface Props {
  slotIdx: number;
  allCodes: SelectableExpression[];
  onClose: () => void;
}

export function CodePickerModal({ slotIdx, allCodes, onClose }: Props) {
  const { state } = usePreferences();
  const { assignCode } = useDispatchHelpers();

  // Codes already picked in OTHER slots — disable them in the picker.
  const takenIds = useMemo(
    () =>
      new Set(
        state.slots
          .map((s, i) => ({ s, i }))
          .filter(({ s, i }) => s.expressionId && i !== slotIdx)
          .map(({ s }) => s.expressionId as string),
      ),
    [state.slots, slotIdx],
  );

  const grouped = useMemo(() => {
    const byCat = new Map<string, SelectableExpression[]>();
    for (const c of allCodes) {
      const arr = byCat.get(c.category) ?? [];
      arr.push(c);
      byCat.set(c.category, arr);
    }
    return PWA_CATEGORY_ORDER.filter((cat) => byCat.has(cat)).map((cat) => ({
      category: cat,
      codes: (byCat.get(cat) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [allCodes]);

  return (
    <div
      className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-x-3 top-8 bottom-8 rounded-xl p-4 flex flex-col"
        style={{
          background:
            "linear-gradient(180deg, var(--card-elevated) 0%, var(--card) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "0 30px 60px -10px rgba(0,0,0,0.66)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-bold tracking-[0.16em] text-accent-emerald">
              ADD TO YOUR CODE
            </div>
            <div className="text-[18px] font-extrabold text-ink-bright tracking-[-0.01em] mt-0.5">
              Pick a code
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-s flex items-center justify-center text-ink hover:text-ink-bright bg-surface-2 border border-line"
            aria-label="Close picker"
          >
            <Icon name="x" size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1">
          {grouped.map(({ category, codes }) => (
            <section key={category}>
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-muted mb-2">
                {category}
              </div>
              <div className="space-y-1.5">
                {codes.map((code) => {
                  const taken = takenIds.has(code.id);
                  const id = identityForCode(code.code);
                  return (
                    <button
                      key={code.id}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        assignCode(slotIdx, code.id);
                        onClose();
                      }}
                      className={[
                        "w-full text-left rounded-m p-3 flex items-center gap-3 border transition",
                        taken
                          ? "border-line/40 bg-card/30 cursor-not-allowed opacity-55"
                          : "border-line bg-card hover:bg-card-elevated hover:border-border-strong",
                      ].join(" ")}
                    >
                      <span
                        className="w-9 h-9 rounded-s flex items-center justify-center text-ink-soft flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${id.c1} 0%, ${id.c2} 100%)`,
                        }}
                      >
                        <Icon name={id.icon as IconName} size={16} strokeWidth={2.2} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-bold text-ink-bright truncate">
                          {code.name}
                        </span>
                        <span className="block text-[10px] font-semibold tracking-[0.04em] uppercase text-ink-muted truncate">
                          {taken ? "Already in your code" : code.category}
                        </span>
                      </span>
                      {!taken && (
                        <Icon name="arrow-right" size={14} className="text-ink-faint" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
