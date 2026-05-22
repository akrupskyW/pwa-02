"use client";

// Codes catalog provider. The selectable expressions catalog is small and
// stable, so we fetch it once on the server in the routed app's layout and
// share it across tabs via this context instead of refetching on every
// client-side navigation.

import { createContext, ReactNode, useContext } from "react";
import type { SelectableExpression } from "@/lib/types";

const CodesContext = createContext<SelectableExpression[] | null>(null);

export function CodesProvider({
  codes,
  children,
}: {
  codes: SelectableExpression[];
  children: ReactNode;
}) {
  return <CodesContext.Provider value={codes}>{children}</CodesContext.Provider>;
}

export function useCodes(): SelectableExpression[] {
  const v = useContext(CodesContext);
  if (!v) throw new Error("useCodes must be used within a CodesProvider");
  return v;
}
