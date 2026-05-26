"use client";

import type { ReactNode } from "react";

import type { SelectableExpression } from "@/lib/types";
import { CodesHydrator } from "@/store/codes-hydrator";
import { useSeedDefaults } from "@/store/preferences-hooks";
import { StoreProvider } from "@/store/store-provider";

// Hoists seeding above the route tree so the default 3-code starter config
// is applied even if the user lands directly on /browse or /scan first.
const SeedRunner = ({ codes }: { codes: SelectableExpression[] }) => {
  useSeedDefaults(codes);
  return null;
};

export const AppProviders = ({
  codes,
  children,
}: {
  codes: SelectableExpression[];
  children: ReactNode;
}) => (
  <StoreProvider>
    <CodesHydrator codes={codes} />
    <SeedRunner codes={codes} />
    {children}
  </StoreProvider>
);
