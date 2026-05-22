"use client";

// The AI-facing pieces of the Preferences hero. Three small surfaces:
//
//   • <AIEmptyHero>      — Variant A. Replaces the regular hero card when
//                          the user has no codes; primary CTA opens the
//                          Talk-to-AI sheet.
//   • <AITagRow>         — Variant B. Fresh AI tags as small chips with a
//                          sparkle provenance glyph.
//   • <AIStaleButton>    — Variant C. Single dashed ghost button that
//                          fires a /api/code/tags refresh against the
//                          current slot signature.
//   • <TalkToAIHeaderPill> — small pill in the screen header that re-opens
//                            the sheet from any state.

import { useCallback, useState } from "react";
import {
  slotsSignature,
  useDispatchHelpers,
  usePreferences,
} from "@/state/preferences-context";
import { useCodes } from "@/state/codes-context";
import { Icon } from "./Icon";

// ─── Empty-state hero (Variant A) ─────────────────────────────────────────

export function AIEmptyHero({ onTalkToAI }: { onTalkToAI: () => void }) {
  return (
    <section
      className="rounded-l p-5 flex flex-col items-center gap-3 text-center"
      style={{
        background:
          "linear-gradient(135deg, var(--card-elevated) 0%, var(--card) 100%)",
        border: "1px solid rgba(52,229,166,0.35)",
        boxShadow: "0 12px 32px -8px rgba(52,229,166,0.22)",
      }}
    >
      <span
        className="w-[54px] h-[54px] rounded-l flex items-center justify-center text-ink-soft"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-violet) 0%, var(--accent-emerald) 100%)",
        }}
      >
        <Icon name="sparkles" size={26} strokeWidth={2.4} />
      </span>
      <div>
        <div className="text-[18px] font-extrabold text-ink-bright tracking-[-0.01em]">
          Compose your code with AI
        </div>
        <div className="text-[12px] font-medium text-ink-muted mt-1.5 leading-snug max-w-[260px]">
          Tell us what matters about your food, and we&apos;ll set up your
          slots and weights.
        </div>
      </div>
      <button
        type="button"
        onClick={onTalkToAI}
        className="rounded-pill text-ink-soft text-[14px] font-extrabold px-5 py-2.5 inline-flex items-center gap-2 shadow-cta-emerald"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-emerald) 0%, var(--accent-teal) 100%)",
        }}
      >
        <Icon name="sparkles" size={14} strokeWidth={2.6} />
        Talk it through
      </button>
    </section>
  );
}

// ─── Tag row + stale Ask-AI button (Variants B + C) ───────────────────────

export function AITagRow() {
  const { state, aiTagsStale, currentSignature, filledCount } = usePreferences();
  const { setAiTags } = useDispatchHelpers();
  const allCodes = useCodes();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(false);
    try {
      const slots = state.slots
        .filter((s) => s.expressionId)
        .map((s) => {
          const code = allCodes.find((c) => c.id === s.expressionId);
          return code ? { code: code.code, weight: s.weight } : null;
        })
        .filter((s): s is NonNullable<typeof s> => Boolean(s));

      const res = await fetch("/api/code/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      const json = (await res.json()) as { tags?: string[]; error?: string };
      if (!res.ok || !json.tags) {
        setError(true);
        return;
      }
      setAiTags(json.tags, currentSignature);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, state.slots, allCodes, currentSignature, setAiTags]);

  if (filledCount === 0) return null;

  // No tags yet — surface a small ghost button so the user can request them.
  if (!state.aiTags) {
    return (
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-ink-soft text-[10px] font-bold tracking-[0.06em] text-ink hover:bg-card-elevated transition disabled:opacity-50"
        style={{
          border: "1.2px dashed rgba(124,124,251,0.55)",
        }}
      >
        {refreshing ? (
          <>
            <span
              aria-hidden
              className="inline-block w-2.5 h-2.5 rounded-full border-2 border-accent-violet/40 border-t-accent-violet animate-spin"
            />
            Asking AI…
          </>
        ) : (
          <>
            <Icon name="sparkles" size={10} strokeWidth={2.4} className="text-accent-violet" />
            Ask AI for tags
          </>
        )}
      </button>
    );
  }

  // Stale tags — show the same ghost button but flag that we have older
  // tags by including a hint.
  if (aiTagsStale) {
    return (
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-ink-soft text-[10px] font-bold tracking-[0.06em] text-ink hover:bg-card-elevated transition disabled:opacity-50"
        style={{
          border: "1.2px dashed rgba(124,124,251,0.55)",
        }}
      >
        {refreshing ? (
          <>
            <span
              aria-hidden
              className="inline-block w-2.5 h-2.5 rounded-full border-2 border-accent-violet/40 border-t-accent-violet animate-spin"
            />
            Refreshing…
          </>
        ) : (
          <>
            <Icon name="sparkles" size={10} strokeWidth={2.4} className="text-accent-violet" />
            Ask AI for new tags
          </>
        )}
      </button>
    );
  }

  // Fresh tags — render the chip row. The "in sync" provenance is the
  // small sparkle dot inside each chip.
  return (
    <div className="flex gap-1.5 flex-wrap">
      {state.aiTags.tags.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-surface border border-line text-[9px] font-bold tracking-[0.04em] text-ink"
        >
          <Icon name="sparkles" size={8} strokeWidth={2.6} className="text-accent-violet" />
          {t}
        </span>
      ))}
      {error && (
        <span className="text-[9px] font-semibold text-accent-rose">
          Refresh failed
        </span>
      )}
    </div>
  );
}

// ─── Header pill (always-available Talk-to-AI entry point) ────────────────

export function TalkToAIHeaderPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface-2 hover:bg-surface-3 transition"
      style={{
        border: "1px solid rgba(124,124,251,0.45)",
      }}
    >
      <Icon name="sparkles" size={12} strokeWidth={2.4} className="text-accent-violet" />
      <span className="text-[11px] font-bold tracking-[0.02em] text-ink-bright">
        Talk to AI
      </span>
    </button>
  );
}

export { slotsSignature };
