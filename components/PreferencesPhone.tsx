"use client";

import { useState } from "react";
import { CodePickerModal } from "./CodePickerModal";
import { SlotCard } from "./SlotCard";
import { ScoreRing } from "./ScoreRing";
import { Icon } from "./Icon";
import { AIEmptyHero, AITagRow, TalkToAIHeaderPill } from "./AIHero";
import { TalkToAISheet } from "./TalkToAISheet";
import { MAX_SLOTS, useCodes, usePreferences } from "@/store/preferences-hooks";

// "Your Code" — DESIGN.md §3, Phone 1.
export const PreferencesPhone = () => {
  const allCodes = useCodes();
  const { state, filledCount } = usePreferences();
  const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);

  // The "weight allocation" displayed on the hero. We always rebalance to 100
  // among filled slots, but show the integer sum to be transparent about it.
  const weightSum = state.slots.reduce((acc, s) => (s.expressionId ? acc + s.weight : acc), 0);
  const inHarmony = filledCount > 0 && weightSum === 100;
  const hasOpenSlot = filledCount < MAX_SLOTS;

  return (
    <div className="relative flex h-full flex-col">
      <ScreenHeader filledCount={filledCount} onTalkToAI={() => setAiSheetOpen(true)} />

      <div className="flex-1 space-y-4 px-5 pb-5">
        {filledCount === 0 ? (
          <AIEmptyHero onTalkToAI={() => setAiSheetOpen(true)} />
        ) : (
          <HeroCard filledCount={filledCount} weightSum={weightSum} inHarmony={inHarmony} />
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
};

const ScreenHeader = ({
  filledCount,
  onTalkToAI,
}: {
  filledCount: number;
  onTalkToAI: () => void;
}) => {
  return (
    <header className="flex items-start justify-between px-5 pt-14 pb-3">
      <div>
        <div className="text-accent-emerald text-[11px] font-bold tracking-[0.16em]">YOUR CODE</div>
        <div className="text-ink-bright mt-0.5 text-[24px] leading-tight font-extrabold tracking-[-0.02em]">
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
          className="rounded-pill text-ink-soft flex h-[38px] w-[38px] items-center justify-center text-[15px] font-extrabold"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent-violet) 0%, var(--color-accent-emerald) 100%)",
          }}
          aria-hidden
        >
          T
        </div>
      )}
    </header>
  );
};

const HeroCard = ({
  filledCount,
  weightSum,
  inHarmony,
}: {
  filledCount: number;
  weightSum: number;
  inHarmony: boolean;
}) => {
  const title = inHarmony ? "In Harmony" : "Composing…";
  const subtitle = `${filledCount} of ${MAX_SLOTS} slots filled — weight totals ${weightSum} of 100.`;

  return (
    <section
      className="flex items-center gap-3.5 rounded-l p-4"
      style={{
        background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface) 100%)",
        border: "1px solid var(--color-line)",
      }}
    >
      <ScoreRing
        value={Math.min(100, weightSum)}
        size={104}
        thicknessRatio={0.18}
        numberSize={32}
        label="OF 100"
      />
      <div className="min-w-0 flex-1">
        <div className="text-ink-bright text-[18px] leading-tight font-bold">{title}</div>
        <div className="text-ink-muted mt-1.5 text-[12px] leading-snug font-medium">{subtitle}</div>
        <div className="mt-2.5">
          <AITagRow />
        </div>
      </div>
    </section>
  );
};

const SectionHeader = ({ filledCount }: { filledCount: number }) => {
  return (
    <div className="flex items-end justify-between px-0.5 pt-1">
      <div className="text-ink-muted text-[11px] font-bold tracking-[0.14em]">
        YOUR CODES · {filledCount} / {MAX_SLOTS}
      </div>
      <button
        type="button"
        className="text-ink rounded-pill bg-surface-2 border-line hover:bg-surface-3 inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-bold tracking-[0.06em] transition"
      >
        <Icon name="rotate-ccw" size={11} strokeWidth={2} />
        Reset
      </button>
    </div>
  );
};
