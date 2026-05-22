"use client";

import { useDispatchHelpers, usePreferences } from "@/state/preferences-context";
import { identityForCode } from "@/lib/code-identity";
import { Icon, type IconName } from "./Icon";
import type { SelectableExpression, Slot } from "@/lib/types";

interface Props {
  slot: Slot;
  slotIdx: number;
  allCodes: SelectableExpression[];
  onOpenPicker: (slotIdx: number) => void;
  /** When all slots are filled, show empty slot cards in a compact "muted"
      style instead of the prominent dashed "+ Add a code" tile. */
  compact?: boolean;
}

// One slot card. See DESIGN.md §3 "Phone 1 — slot cards".
export function SlotCard({ slot, slotIdx, allCodes, onOpenPicker, compact }: Props) {
  const { filledCount } = usePreferences();
  const { removeCode, setWeight } = useDispatchHelpers();

  const code = allCodes.find((c) => c.id === slot.expressionId) ?? null;

  if (!code) {
    if (compact) return null; // hide extra empties when 5/5 filled
    return (
      <button
        type="button"
        onClick={() => onOpenPicker(slotIdx)}
        className="w-full rounded-m px-4 py-3.5 flex items-center justify-center gap-2 text-ink hover:text-ink-bright transition"
        style={{
          background: "var(--ink-soft)",
          border: "1.5px dashed var(--border)",
        }}
      >
        <Icon name="plus" size={18} strokeWidth={2.2} className="text-accent-emerald" />
        <span className="text-[14px] font-bold tracking-[0.02em]">Add a code</span>
      </button>
    );
  }

  const identity = identityForCode(code.code);
  // One filled slot is locked at 100% — no slider, no remove.
  const sliderDisabled = filledCount <= 1;
  const pct = Math.max(0, Math.min(100, slot.weight));

  return (
    <div
      className="range-slot w-full rounded-m p-3.5 group"
      style={{
        background: "rgba(15,23,41,0.9)",
        border: "1px solid var(--border)",
        // Wire the gradient + percent into the .range-slot CSS so the slider
        // track renders the code's identity gradient.
        ["--range-c1" as string]: identity.c1,
        ["--range-c2" as string]: identity.c2,
        ["--range-pct" as string]: `${pct}%`,
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onOpenPicker(slotIdx)}
          aria-label={`Change code ${code.name}`}
          className="w-[38px] h-[38px] rounded-s flex items-center justify-center text-ink-soft flex-shrink-0 transition active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${identity.c1} 0%, ${identity.c2} 100%)`,
          }}
        >
          <Icon name={identity.icon as IconName} size={18} strokeWidth={2.2} />
        </button>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onOpenPicker(slotIdx)}
            className="block text-left w-full"
          >
            <div className="text-[14px] font-bold text-ink-bright truncate">
              {code.name}
            </div>
            <div className="text-[10px] font-semibold tracking-[0.04em] text-ink-muted uppercase truncate">
              {code.category}
            </div>
          </button>
        </div>
        <div className="flex items-baseline gap-0.5 mr-1">
          <span className="text-[22px] font-extrabold tabular-nums text-ink-bright leading-none">
            {slot.weight}
          </span>
          <span className="text-[11px] font-bold text-ink-muted">%</span>
        </div>
        <button
          type="button"
          onClick={() => removeCode(slotIdx)}
          aria-label="Remove code"
          className="ml-0.5 w-7 h-7 rounded-full flex items-center justify-center text-ink-faint hover:text-ink-bright hover:bg-surface-3 transition"
        >
          <Icon name="x" size={14} strokeWidth={2.2} />
        </button>
      </div>

      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={slot.weight}
          disabled={sliderDisabled}
          onChange={(e) => setWeight(slotIdx, Number(e.target.value))}
          aria-label={`${code.name} weight`}
        />
      </div>
    </div>
  );
}
