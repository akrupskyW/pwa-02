"use client";

import { useDispatchHelpers, usePreferences } from "@/state/preferences-context";
import type { SelectableExpression, Slot } from "@/lib/types";

interface Props {
  slot: Slot;
  slotIdx: number;
  allCodes: SelectableExpression[];
  onOpenPicker: (slotIdx: number) => void;
}

export function SlotCard({ slot, slotIdx, allCodes, onOpenPicker }: Props) {
  const { filledCount } = usePreferences();
  const { removeCode, setWeight } = useDispatchHelpers();

  const code = allCodes.find((c) => c.id === slot.expressionId) ?? null;

  if (!code) {
    return (
      <button
        type="button"
        onClick={() => onOpenPicker(slotIdx)}
        className="w-full rounded-2xl border border-dashed border-screen-line/60 bg-screen-card/30 hover:bg-screen-card/50 transition py-4 px-4 text-left"
      >
        <div className="text-screen-subtle text-sm">＋ Add a code</div>
      </button>
    );
  }

  // Single filled slot is locked at 100% — no slider, no remove.
  const sliderDisabled = filledCount <= 1;

  return (
    <div className="w-full rounded-2xl bg-screen-card border border-screen-line p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => onOpenPicker(slotIdx)}
          className="text-sm font-medium text-white text-left flex-1 truncate"
        >
          {code.name}
        </button>
        <button
          type="button"
          onClick={() => removeCode(slotIdx)}
          aria-label="Remove code"
          className="ml-2 text-screen-subtle hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={slot.weight}
          disabled={sliderDisabled}
          onChange={(e) => setWeight(slotIdx, Number(e.target.value))}
          className="flex-1 accent-accent-gold disabled:opacity-50"
        />
        <div className="text-sm font-semibold tabular-nums w-10 text-right">{slot.weight}%</div>
      </div>
    </div>
  );
}
