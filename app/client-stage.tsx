"use client";

import { BrowsePhone } from "@/components/BrowsePhone";
import { PhoneFrame } from "@/components/PhoneFrame";
import { PreferencesPhone } from "@/components/PreferencesPhone";
import { ProductPhone } from "@/components/ProductPhone";
import { PreferencesProvider } from "@/state/preferences-context";
import type { SelectableExpression } from "@/lib/types";

interface Props {
  allCodes: SelectableExpression[];
}

export function ClientStage({ allCodes }: Props) {
  return (
    <PreferencesProvider>
      <main className="min-h-screen bg-stage-900 px-6 py-10">
        <header className="max-w-6xl mx-auto text-center mb-10">
          <div className="inline-block text-[11px] uppercase tracking-wider text-screen-subtle border border-screen-line rounded-full px-3 py-1">
            MVP · Personalized Nutrition
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight">
            Your score. <span className="text-accent-gold">Your codes.</span> Your weights.
          </h1>
          <p className="mt-3 text-screen-subtle text-sm md:text-base max-w-2xl mx-auto">
            Pick up to five WISEcode codes that matter to you, weight them, and see how any
            product scores against <em>your</em> personal definition of good food.
          </p>
        </header>

        <div className="flex flex-wrap justify-center items-start gap-10 md:gap-16">
          <PhoneFrame label="1 · Define your code">
            <PreferencesPhone allCodes={allCodes} />
          </PhoneFrame>
          <PhoneFrame label="2 · Browse foods">
            <BrowsePhone allCodes={allCodes} />
          </PhoneFrame>
          <PhoneFrame label="3 · Scan a product">
            <ProductPhone allCodes={allCodes} />
          </PhoneFrame>
        </div>

        <footer className="max-w-3xl mx-auto mt-12 text-center text-[12px] text-screen-subtle leading-relaxed px-4">
          Live codes from the WISEcode food intelligence corpus. Slot configuration and the
          last scanned product persist in your browser via localStorage.
        </footer>
      </main>
    </PreferencesProvider>
  );
}
