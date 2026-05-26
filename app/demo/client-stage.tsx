"use client";

import Link from "next/link";

import { BrowsePhone } from "@/components/BrowsePhone";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PreferencesPhone } from "@/components/PreferencesPhone";
import { ProductPhone } from "@/components/ProductPhone";
import type { SelectableExpression } from "@/lib/types";
import { CodesHydrator } from "@/store/codes-hydrator";
import { useSeedDefaults } from "@/store/preferences-hooks";
import { StoreProvider } from "@/store/store-provider";

interface Props {
  allCodes: SelectableExpression[];
}

const SeedRunner = ({ codes }: { codes: SelectableExpression[] }) => {
  useSeedDefaults(codes);
  return null;
};

// Demo / presentation surface: the three phones side by side on a dark stage.
// Kept as a parallel route to the real PWA at "/" so the feedback-loop demo
// (drag a slider, see browse + scan recompute together) is still available
// for stakeholder demos and design reviews.
export const ClientStage = ({ allCodes }: Props) => (
  <StoreProvider>
    <CodesHydrator codes={allCodes} />
    <SeedRunner codes={allCodes} />
    <main className="bg-background relative min-h-screen overflow-hidden px-6 py-16">
      {/* Stage-level brand glows behind the phones. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(52,229,166,0.30), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-40 h-[700px] w-[700px] rounded-full opacity-60 blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(124,124,251,0.30), transparent 70%)",
        }}
      />

      <header className="relative z-10 mx-auto mb-12 max-w-6xl text-center">
        <div className="text-accent-emerald inline-block text-[12px] font-bold tracking-[0.22em] uppercase">
          Personalized Nutrition
        </div>
        <h1 className="text-ink-bright mt-4 text-4xl leading-tight font-extrabold tracking-[-0.03em] md:text-6xl">
          Bring your own rubric.
        </h1>
        <p className="text-ink-muted mx-auto mt-4 max-w-2xl text-base leading-relaxed md:text-lg">
          Compose the codes that matter to you. Watch the entire catalog re-sort to your taste in
          real time. Every score is yours alone.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-pill text-ink-soft shadow-cta-emerald inline-flex items-center gap-2 px-5 py-3 text-[15px] font-extrabold"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent-emerald) 0%, var(--color-accent-teal) 100%)",
            }}
          >
            Try the demo →
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-wrap items-start justify-center gap-10 md:gap-12">
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

      <footer className="text-ink-muted relative z-10 mx-auto mt-14 max-w-3xl px-4 text-center text-[12px] leading-relaxed">
        Live codes from the WISEcode food intelligence corpus. Slot configuration and the last
        scanned product persist in your browser via localStorage.
      </footer>
    </main>
  </StoreProvider>
);
