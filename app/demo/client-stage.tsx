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
        <main className="min-h-screen bg-stage-900 px-6 py-10">
          <header className="max-w-6xl mx-auto text-center mb-10">
            <div className="inline-block text-[11px] uppercase tracking-wider text-screen-subtle border border-screen-line rounded-full px-3 py-1">
              Demo · Personalized Nutrition
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
              Your score. <span className="text-accent-gold">Your codes.</span> Your weights.
            </h1>
            <p className="mt-3 text-screen-subtle text-sm md:text-base max-w-2xl mx-auto">
              Pick up to five WISEcode codes that matter to you, weight them, and see how any
              product scores against <em>your</em> personal definition of good food.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-[12px] text-accent-gold hover:underline"
            >
              ← Open the live PWA
            </Link>
          </header>

          <div className="flex flex-wrap justify-center items-start gap-10 md:gap-16">
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

          <footer className="max-w-3xl mx-auto mt-12 text-center text-[12px] text-screen-subtle leading-relaxed px-4">
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
