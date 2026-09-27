"use client";

import { useMemo } from "react";
import { checkCompatibility } from "@/lib/compatibility/engine";
import { defaultStyle, mergeProfile, STYLE_PROFILES } from "@/lib/recommend/profiles";
import { computeStats } from "@/lib/stats";
import { useBuilder } from "@/store/builder";

/** Everything derived from the current build, memoised on its parts. */
export function useDerived() {
  const build = useBuilder((s) => s.build);
  const ctx = useBuilder((s) => s.assistantContext);
  return useMemo(() => {
    const stats = computeStats(build.discipline, build.parts);
    const compat = checkCompatibility(build.discipline, build.parts);
    const style = ctx.style ?? defaultStyle(build.discipline, stats.frontTravelMm);
    let profile = STYLE_PROFILES[style];
    for (const p of ctx.priorities ?? []) {
      if (p === "weight") profile = mergeProfile(profile, { weight: 1.2 });
      if (p === "comfort") profile = mergeProfile(profile, { comfort: 1.2 });
      if (p === "durability") profile = mergeProfile(profile, { durability: 1.2 });
    }
    return { build, stats, compat, style, profile };
  }, [build, ctx]);
}
