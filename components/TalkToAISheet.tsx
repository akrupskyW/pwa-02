"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { slotsSignature, useDispatchHelpers } from "@/store/preferences-hooks";
import { Icon } from "./Icon";

interface Props {
  onClose: () => void;
}

interface ComposeResponse {
  slots: { expressionId: string; code: string; name: string; weight: number }[];
  tags: string[];
  rationale: string;
}

const EXAMPLE_PROMPTS = [
  "I want to eat clean and avoid processed food.",
  "I'm a runner who needs protein but also watches sugar.",
  "Heart health is my top priority, then plant-forward eating.",
];

// Bottom sheet — slides up from the bottom of the phone shell. The user
// types what matters to them in food; we POST to /api/code/compose; the
// model returns chosen slots + descriptive tags; we replace the entire
// slot config and store the AI tags against the new signature.
export const TalkToAISheet = ({ onClose }: Props) => {
  const { replaceSlots, setAiTags } = useDispatchHelpers();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Autofocus the textarea on open.
  useEffect(() => {
    taRef.current?.focus();
  }, []);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/code/compose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      const json = (await res.json()) as ComposeResponse | { error: string };
      if (!res.ok || "error" in json) {
        const message = "error" in json ? json.error : `Request failed: ${res.status}`;
        setError(message);
        return;
      }
      // Convert the AI response into our internal slot shape, then
      // compute the post-replace signature for the tag binding.
      const newSlots = json.slots.map((s) => ({
        expressionId: s.expressionId,
        weight: s.weight,
      }));
      replaceSlots(newSlots);
      setAiTags(json.tags, slotsSignature(newSlots));
      onClose();
    } catch (err) {
      console.error(err);
      setError("Couldn't reach the model. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, onClose, replaceSlots, setAiTags]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-stretch"
      role="dialog"
      aria-modal="true"
      aria-labelledby="talk-to-ai-title"
    >
      {/* Backdrop. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* The sheet — 75% of phone height, slides up from the bottom. */}
      <div
        className="relative flex max-h-[75%] w-full flex-col rounded-t-[28px]"
        style={{
          background:
            "linear-gradient(180deg, var(--color-card-elevated) 0%, var(--color-card) 100%)",
          border: "1px solid var(--color-line)",
          borderBottom: "none",
          boxShadow: "0 -20px 60px -10px rgba(0,0,0,0.66)",
        }}
      >
        {/* Grabber. */}
        <div className="flex justify-center pt-3 pb-1">
          <span className="rounded-pill bg-line-strong block h-1.5 w-10" />
        </div>

        <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className="text-ink-soft flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent-violet) 0%, var(--color-accent-emerald) 100%)",
              }}
            >
              <Icon name="sparkles" size={18} strokeWidth={2.4} />
            </span>
            <div className="flex-1">
              <div className="text-accent-violet text-[10px] font-bold tracking-[0.16em]">
                COMPOSE WITH AI
              </div>
              <div
                id="talk-to-ai-title"
                className="text-ink-bright text-[18px] font-extrabold tracking-[-0.01em]"
              >
                What matters to you?
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-ink hover:text-ink-bright bg-surface-2 border-line flex h-9 w-9 shrink-0 items-center justify-center rounded-s border"
          >
            <Icon name="x" size={16} strokeWidth={2.2} />
          </button>
        </div>

        <div className="no-scrollbar space-y-3 overflow-y-auto px-5 pb-5">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1200}
            rows={4}
            placeholder="e.g. I want to eat clean, get more protein, and avoid ultra-processed foods."
            className="rounded-m bg-ink-soft border-line text-ink-bright placeholder:text-ink-faint focus:border-accent-violet/60 w-full resize-none border p-3.5 text-[14px] leading-relaxed transition outline-none"
          />

          {!text && (
            <div className="space-y-1.5">
              <div className="text-ink-faint text-[10px] font-bold tracking-[0.14em]">
                NEED A STARTING POINT?
              </div>
              <div className="space-y-1.5">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setText(p)}
                    className="bg-card border-line hover:bg-card-elevated hover:border-line-strong text-ink w-full rounded-s border px-3 py-2 text-left text-[12px] leading-snug transition"
                  >
                    &ldquo;{p}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-m bg-card border-accent-rose/40 text-accent-rose border p-3 text-[12px]">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-pill bg-surface-2 border-line text-ink-bright hover:bg-surface-3 flex-1 border py-3 text-[13px] font-bold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !text.trim()}
              className="rounded-pill text-ink-soft shadow-cta-emerald inline-flex flex-[2] items-center justify-center gap-2 py-3 text-[14px] font-extrabold disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-accent-emerald) 0%, var(--color-accent-teal) 100%)",
              }}
            >
              {submitting ? (
                <>
                  <span
                    aria-hidden
                    className="border-ink-soft/40 border-t-ink-soft inline-block h-3 w-3 animate-spin rounded-full border-2"
                  />
                  Composing…
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={14} strokeWidth={2.6} />
                  Compose
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
