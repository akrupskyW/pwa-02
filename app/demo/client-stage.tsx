"use client";

import Link from "next/link";
import { BrowsePhone } from "@/components/BrowsePhone";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PreferencesPhone } from "@/components/PreferencesPhone";
import { ProductPhone } from "@/components/ProductPhone";
import { CodesProvider } from "@/state/codes-context";
import { PreferencesProvider, useSeedDefaults } from "@/state/preferences-context";
import type { SelectableExpression } from "@/lib/types";

interface Props {
  allCodes: SelectableExpression[];
}

// Demo / presentation surface: the three phones side by side on a dark stage.
// Kept as a parallel route to the real PWA at "/" so the feedback-loop demo
// (drag a slider, see browse + scan recompute together) is still available
// for stakeholder demos and design reviews.
export function ClientStage({ allCodes }: Props) {
  return (
    <CodesProvider codes={allCodes}>
      <PreferencesProvider>
        <SeedRunner codes={allCodes} />
        <main className="min-h-screen bg-background px-6 py-16 relative overflow-hidden">
          {/* Stage-level brand glows behind the phones. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(52,229,166,0.30), transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(124,124,251,0.30), transparent 70%)",
            }}
          />

          <header className="max-w-6xl mx-auto text-center mb-12 relative z-10">
            <div className="inline-block text-[12px] font-bold uppercase tracking-[0.22em] text-accent-emerald">
              Personalized Nutrition
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-[-0.03em] text-ink-bright leading-tight">
              Bring your own rubric.
            </h1>
            <p className="mt-4 text-ink-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Compose the codes that matter to you. Watch the entire catalog re-sort to your
              taste in real time. Every score is yours alone.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href="/"
                className="rounded-pill text-ink-soft text-[15px] font-extrabold px-5 py-3 inline-flex items-center gap-2 shadow-cta-emerald"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-emerald) 0%, var(--accent-teal) 100%)",
                }}
              >
                Try the demo →
              </Link>
            </div>
          </header>

          <div className="flex flex-wrap justify-center items-start gap-10 md:gap-12 relative z-10">
            <PhoneFrame label="1 · Define your code">
              <PreferencesPhone />
            </PhoneFrame>
            <PhoneFrame label="2 · Browse foods">
              <BrowsePhone />
            </PhoneFrame>
            <PhoneFrame label="3 · Scan a product">
              <ProductPhone />
            </PhoneFrame>
          </div>

          <footer className="max-w-3xl mx-auto mt-14 text-center text-[12px] text-ink-muted leading-relaxed px-4 relative z-10">
            Live codes from the WISEcode food intelligence corpus. Slot configuration and the
            last scanned product persist in your browser via localStorage.
          </footer>
        </main>
      </PreferencesProvider>
    </CodesProvider>
  );
}

function SeedRunner({ codes }: { codes: SelectableExpression[] }) {
  useSeedDefaults(codes);
  return null;
}
