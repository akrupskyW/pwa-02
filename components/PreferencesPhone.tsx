"use client";

import { useState } from "react";
import { CodePickerModal } from "./CodePickerModal";
import { SlotCard } from "./SlotCard";
import { useSeedDefaults, usePreferences } from "@/state/preferences-context";
import type { SelectableExpression } from "@/lib/types";

interface Props {
  allCodes: SelectableExpression[];
}

export function PreferencesPhone({ allCodes }: Props) {
  const { state } = usePreferences();
  const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
  useSeedDefaults(allCodes);

  return (
    <div className="h-full flex flex-col relative">
      <header className="bg-gradient-to-b from-stage-800 to-stage-700 text-white px-5 pt-16 pb-5 text-center">
        <div className="text-[22px] font-extrabold tracking-tight">Define your code</div>
        <div className="text-[13px] text-screen-subtle mt-1">Up to 5 codes · weights total 100</div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-2">
        {state.slots.map((slot, i) => (
          <SlotCard
            key={i}
            slot={slot}
            slotIdx={i}
            allCodes={allCodes}
            onOpenPicker={(idx) => setPickerSlotIdx(idx)}
          />
        ))}
      </div>

      {pickerSlotIdx !== null && (
        <CodePickerModal
          slotIdx={pickerSlotIdx}
          allCodes={allCodes}
          onClose={() => setPickerSlotIdx(null)}
        />
      )}
    </div>
  );
}
