"use client";

import { useMemo } from "react";
import { PWA_CATEGORY_ORDER } from "@/lib/category-map";
import { usePreferences, useDispatchHelpers } from "@/state/preferences-context";
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
      className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-x-3 top-12 bottom-12 rounded-3xl bg-screen-bg border border-screen-line p-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Pick a code</div>
          <button
            type="button"
            onClick={onClose}
            className="text-screen-subtle hover:text-white text-xl leading-none"
            aria-label="Close picker"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
          {grouped.map(({ category, codes }) => (
            <section key={category}>
              <div className="text-[11px] uppercase tracking-wider text-screen-subtle mb-1">
                {category}
              </div>
              <div className="space-y-1">
                {codes.map((code) => {
                  const taken = takenIds.has(code.id);
                  return (
                    <button
                      key={code.id}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        assignCode(slotIdx, code.id);
                        onClose();
                      }}
                      className={`w-full text-left text-sm rounded-lg px-3 py-2 border ${
                        taken
                          ? "border-screen-line/40 text-screen-subtle bg-screen-card/30 cursor-not-allowed"
                          : "border-screen-line bg-screen-card hover:bg-screen-card/70"
                      }`}
                    >
                      {code.name}
                      {taken && (
                        <span className="ml-2 text-[11px] text-screen-subtle">(already used)</span>
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
