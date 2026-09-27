import type { Discipline, Ratings } from "../types";

export type RidingStyle = "xc" | "trail" | "enduro" | "road-race" | "endurance";

/** What a rider values. Weights are relative; `weight` penalises grams. */
export interface PreferenceProfile extends Ratings {
  weight: number;
}

export const STYLE_PROFILES: Record<RidingStyle, PreferenceProfile> = {
  xc: { performance: 1.2, comfort: 0.3, durability: 0.4, climbing: 1.5, descending: 0.4, weight: 1.5 },
  trail: { performance: 1, comfort: 0.7, durability: 0.7, climbing: 0.8, descending: 1.1, weight: 0.6 },
  enduro: { performance: 0.9, comfort: 0.8, durability: 1, climbing: 0.3, descending: 1.6, weight: 0.2 },
  "road-race": { performance: 1.5, comfort: 0.4, durability: 0.4, climbing: 1.1, descending: 0.8, weight: 1.2 },
  endurance: { performance: 0.8, comfort: 1.5, durability: 1, climbing: 0.8, descending: 0.7, weight: 0.5 },
};

export const BALANCED: PreferenceProfile = {
  performance: 1, comfort: 0.7, durability: 0.7, climbing: 0.8, descending: 0.8, weight: 0.7,
};

export const STYLE_LABEL: Record<RidingStyle, string> = {
  xc: "cross-country / racing",
  trail: "trail riding",
  enduro: "enduro / bike park",
  "road-race": "road racing",
  endurance: "endurance road riding",
};

/** Target fork travel per style (MTB only). */
export const STYLE_TRAVEL: Partial<Record<RidingStyle, [number, number]>> = {
  xc: [100, 120],
  trail: [140, 160],
  enduro: [160, 180],
};

export function defaultStyle(discipline: Discipline, forkTravel: number): RidingStyle {
  if (discipline === "road") return "road-race";
  if (forkTravel <= 120) return "xc";
  if (forkTravel <= 160) return "trail";
  return "enduro";
}

export function mergeProfile(base: PreferenceProfile, patch: Partial<PreferenceProfile>): PreferenceProfile {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch) as [keyof PreferenceProfile, number][]) out[k] = (out[k] ?? 0) + v;
  return out;
}
