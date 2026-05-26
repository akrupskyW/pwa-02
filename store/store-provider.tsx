"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";

import { hydrateFromStorage } from "@/store/middleware/persistence";

import { makeStore, type AppStore } from "@/store";

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const storeRef = useRef<AppStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = makeStore();
  }

  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !storeRef.current) return;
    hydratedRef.current = true;
    hydrateFromStorage(storeRef.current.dispatch);
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
};
