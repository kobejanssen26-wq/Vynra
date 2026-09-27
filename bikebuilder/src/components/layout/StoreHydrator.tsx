"use client";

import { useEffect } from "react";
import { useBuilder } from "@/store/builder";

/** Loads persisted builder state after mount (the store skips SSR hydration). */
export function StoreHydrator() {
  useEffect(() => {
    void useBuilder.persist.rehydrate();
  }, []);
  return null;
}
