"use client";

import { useDispatchHelpers, usePreferences } from "@/store/preferences-hooks";
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
export const SlotCard = ({ slot, slotIdx, allCodes, onOpenPicker, compact }: Props) => {
  const { filledCount } = usePreferences();
  const { removeCode, setWeight } = useDispatchHelpers();

  const code = allCodes.find((c) => c.id === slot.expressionId) ?? null;

  if (!code) {
    if (compact) return null; // hide extra empties when 5/5 filled
    return (
      <button
        type="button"
        onClick={() => onOpenPicker(slotIdx)}
        className="rounded-m text-ink hover:text-ink-bright flex w-full items-center justify-center gap-2 px-4 py-3.5 transition"
        style={{
          background: "var(--color-ink-soft)",
          border: "1.5px dashed var(--color-line)",
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
      className="range-slot rounded-m group w-full p-3.5"
      style={{
        background: "rgba(15,23,41,0.9)",
        border: "1px solid var(--color-line)",
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
          className="text-ink-soft flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-s transition active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${identity.c1} 0%, ${identity.c2} 100%)`,
          }}
        >
          <Icon name={identity.icon as IconName} size={18} strokeWidth={2.2} />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenPicker(slotIdx)}
            className="block w-full text-left"
          >
            <div className="text-ink-bright truncate text-[14px] font-bold">{code.name}</div>
            <div className="text-ink-muted truncate text-[10px] font-semibold tracking-[0.04em] uppercase">
              {code.category}
            </div>
          </button>
        </div>
        <div className="mr-1 flex items-baseline gap-0.5">
          <span className="text-ink-bright text-[22px] leading-none font-extrabold tabular-nums">
            {slot.weight}
          </span>
          <span className="text-ink-muted text-[11px] font-bold">%</span>
        </div>
        <button
          type="button"
          onClick={() => removeCode(slotIdx)}
          aria-label="Remove code"
          className="text-ink-faint hover:text-ink-bright hover:bg-surface-3 ml-0.5 flex h-7 w-7 items-center justify-center rounded-full transition"
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
};
