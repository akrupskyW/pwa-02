"use client";

import { useMemo } from "react";
import { PWA_CATEGORY_ORDER } from "@/lib/category-map";
import { identityForCode } from "@/lib/code-identity";
import { useDispatchHelpers, usePreferences } from "@/store/preferences-hooks";
import { Icon, type IconName } from "./Icon";
import type { SelectableExpression } from "@/lib/types";

interface Props {
  slotIdx: number;
  allCodes: SelectableExpression[];
  onClose: () => void;
}

export const CodePickerModal = ({ slotIdx, allCodes, onClose }: Props) => {
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
        className="absolute inset-x-3 top-8 bottom-8 flex flex-col rounded-xl p-4"
        style={{
          background:
            "linear-gradient(180deg, var(--color-card-elevated) 0%, var(--color-card) 100%)",
          border: "1px solid var(--color-line)",
          boxShadow: "0 30px 60px -10px rgba(15,10,31,0.26)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-accent-emerald text-[10px] font-bold tracking-[0.16em]">
              ADD TO YOUR CODE
            </div>
            <div className="text-ink-bright mt-0.5 text-[18px] font-extrabold tracking-[-0.01em]">
              Pick a code
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink hover:text-ink-bright bg-surface-2 border-line flex h-9 w-9 items-center justify-center rounded-s border"
            aria-label="Close picker"
          >
            <Icon name="x" size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto pr-1">
          {grouped.map(({ category, codes }) => (
            <section key={category}>
              <div className="text-ink-muted mb-2 text-[10px] font-bold tracking-[0.14em] uppercase">
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
                        "rounded-m flex w-full items-center gap-3 border p-3 text-left transition",
                        taken
                          ? "border-line/40 bg-card/30 cursor-not-allowed opacity-55"
                          : "border-line bg-card hover:bg-card-elevated hover:border-line-strong",
                      ].join(" ")}
                    >
                      <span
                        className="text-ink-soft flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${id.c1} 0%, ${id.c2} 100%)`,
                        }}
                      >
                        <Icon name={id.icon as IconName} size={16} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-ink-bright block truncate text-[14px] font-bold">
                          {code.name}
                        </span>
                        <span className="text-ink-muted block truncate text-[10px] font-semibold tracking-[0.04em] uppercase">
                          {taken ? "Already in your code" : code.category}
                        </span>
                      </span>
                      {!taken && <Icon name="arrow-right" size={14} className="text-ink-faint" />}
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
};
