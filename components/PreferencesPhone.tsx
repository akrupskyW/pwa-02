"use client";

import { useState } from "react";
import { CodePickerModal } from "./CodePickerModal";
import { SlotCard } from "./SlotCard";
import { ScoreRing } from "./ScoreRing";
import { Icon } from "./Icon";
import {
  AIEmptyHero,
  AITagRow,
  TalkToAIHeaderPill,
} from "./AIHero";
import { TalkToAISheet } from "./TalkToAISheet";
import { MAX_SLOTS, usePreferences } from "@/state/preferences-context";
import { useCodes } from "@/state/codes-context";

// "Your Code" — DESIGN.md §3, Phone 1.
export function PreferencesPhone() {
  const allCodes = useCodes();
  const { state, filledCount } = usePreferences();
  const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);

  // The "weight allocation" displayed on the hero. We always rebalance to 100
  // among filled slots, but show the integer sum to be transparent about it.
  const weightSum = state.slots.reduce(
    (acc, s) => (s.expressionId ? acc + s.weight : acc),
    0,
  );
  const inHarmony = filledCount > 0 && weightSum === 100;
  const hasOpenSlot = filledCount < MAX_SLOTS;

  return (
    <div className="h-full flex flex-col relative">
      <ScreenHeader
        filledCount={filledCount}
        onTalkToAI={() => setAiSheetOpen(true)}
      />

      <div className="flex-1 px-5 pb-5 space-y-4">
        {filledCount === 0 ? (
          <AIEmptyHero onTalkToAI={() => setAiSheetOpen(true)} />
        ) : (
          <HeroCard
            filledCount={filledCount}
            weightSum={weightSum}
            inHarmony={inHarmony}
          />
        )}

        <SectionHeader filledCount={filledCount} />

        <div className="space-y-2.5">
          {state.slots.map((slot, i) => (
            <SlotCard
              key={i}
              slot={slot}
              slotIdx={i}
              allCodes={allCodes}
              onOpenPicker={(idx) => setPickerSlotIdx(idx)}
              compact={!hasOpenSlot}
            />
          ))}
        </div>
      </div>

      {pickerSlotIdx !== null && (
        <CodePickerModal
          slotIdx={pickerSlotIdx}
          allCodes={allCodes}
          onClose={() => setPickerSlotIdx(null)}
        />
      )}

      {aiSheetOpen && <TalkToAISheet onClose={() => setAiSheetOpen(false)} />}
    </div>
  );
}

function ScreenHeader({
  filledCount,
  onTalkToAI,
}: {
  filledCount: number;
  onTalkToAI: () => void;
}) {
  return (
    <header className="px-5 pt-14 pb-3 flex items-start justify-between">
      <div>
        <div className="text-[11px] font-bold tracking-[0.16em] text-accent-emerald">
          YOUR CODE
        </div>
        <div className="text-[24px] font-extrabold tracking-[-0.02em] text-ink-bright leading-tight mt-0.5">
          Personal Rubric
        </div>
      </div>
      {/* Once the user has any codes, the header's right slot becomes the
          always-available "Talk to AI" entry point. Empty state hides it —
          AIEmptyHero is the obvious entry point there. */}
      {filledCount > 0 ? (
        <TalkToAIHeaderPill onClick={onTalkToAI} />
      ) : (
        <div
          className="w-[38px] h-[38px] rounded-pill flex items-center justify-center text-[15px] font-extrabold text-ink-soft"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-emerald) 100%)",
          }}
          aria-hidden
        >
          T
        </div>
      )}
    </header>
  );
}

function HeroCard({
  filledCount,
  weightSum,
  inHarmony,
}: {
  filledCount: number;
  weightSum: number;
  inHarmony: boolean;
}) {
  const title = inHarmony ? "In Harmony" : "Composing…";
  const subtitle = `${filledCount} of ${MAX_SLOTS} slots filled — weight totals ${weightSum} of 100.`;

  return (
    <section
      className="rounded-l p-4 flex items-center gap-3.5"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 100%)",
        border: "1px solid var(--border)",
      }}
    >
      <ScoreRing
        value={Math.min(100, weightSum)}
        size={104}
        thicknessRatio={0.18}
        numberSize={32}
        label="OF 100"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[18px] font-bold text-ink-bright leading-tight">
          {title}
        </div>
        <div className="text-[12px] font-medium text-ink-muted leading-snug mt-1.5">
          {subtitle}
        </div>
        <div className="mt-2.5">
          <AITagRow />
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ filledCount }: { filledCount: number }) {
  return (
    <div className="flex items-end justify-between px-0.5 pt-1">
      <div className="text-[11px] font-bold tracking-[0.14em] text-ink-muted">
        YOUR CODES · {filledCount} / {MAX_SLOTS}
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.06em] text-ink px-2 py-1 rounded-pill bg-surface-2 border border-line hover:bg-surface-3 transition"
      >
        <Icon name="rotate-ccw" size={11} strokeWidth={2} />
        Reset
      </button>
    </div>
  );
}
