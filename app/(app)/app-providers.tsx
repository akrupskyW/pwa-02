"use client";

import { ReactNode } from "react";
import { CodesProvider } from "@/state/codes-context";
import { PreferencesProvider, useSeedDefaults } from "@/state/preferences-context";
import type { SelectableExpression } from "@/lib/types";

// Hoists seeding above the route tree so the default 3-code starter config
// is applied even if the user lands directly on /browse or /scan first.
function SeedRunner({ codes }: { codes: SelectableExpression[] }) {
  useSeedDefaults(codes);
  return null;
}

export function AppProviders({
  codes,
  children,
}: {
  codes: SelectableExpression[];
  children: ReactNode;
}) {
  return (
    <CodesProvider codes={codes}>
      <PreferencesProvider>
        <SeedRunner codes={codes} />
        {children}
      </PreferencesProvider>
    </CodesProvider>
  );
}
