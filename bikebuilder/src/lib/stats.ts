import { CATEGORIES, HARDWARE_ALLOWANCE_G } from "./categories";
import { resolveParts } from "./compatibility/engine";
import type { BuildStats, CategoryId, Discipline, PartSelection } from "./types";

/**
 * Heuristic build scoring.
 *
 * Price and weight are sums of catalog data. Performance, comfort, durability,
 * climbing and descending are weighted averages of per-component ratings — a
 * transparent index for comparing builds, not a lab measurement.
 */
export function computeStats(discipline: Discipline, selection: PartSelection): BuildStats {
  const parts = resolveParts(selection);
  let price = 0;
  let grams = 0;
  let wSum = 0;
  const acc = { performance: 0, comfort: 0, durability: 0, climbing: 0, descending: 0 };
  let electronic = 0;
  let highMaint = 0;
  const missing: CategoryId[] = [];

  for (const meta of CATEGORIES) {
    const c = parts[meta.id];
    if (!c) {
      if (meta.required) missing.push(meta.id);
      continue;
    }
    price += c.priceEur;
    grams += c.weightG;
    wSum += meta.weight;
    for (const k of Object.keys(acc) as (keyof typeof acc)[]) acc[k] += c.ratings[k] * meta.weight;
    if (c.compat.electronic) electronic++;
    if (c.maintenance === "high") highMaint += 2;
    else if (c.maintenance === "medium") highMaint += 1;
  }

  const avg = (k: keyof typeof acc) => (wSum ? acc[k] / wSum : 0);
  const allowance = Object.keys(parts).length ? HARDWARE_ALLOWANCE_G[discipline] : 0;
  const weightKg = (grams + allowance) / 1000;

  // Lighter bikes climb better: ±0.25 points per kg away from a reference weight.
  const refKg = discipline === "road" ? 7.5 : 12.5;
  const weightAdj = wSum ? Math.max(-1.5, Math.min(1.5, (refKg - weightKg) * 0.25)) : 0;
  const climbing = clamp(avg("climbing") + weightAdj, 0, 10);

  const frontTravel = parts.fork?.compat.travelMm ?? 0;
  const rearTravel = parts.frame?.compat.travelMm ?? 0;

  const maintScore = highMaint + electronic * 0.5;
  const maintenance = maintScore <= 4 ? "Easy" : maintScore <= 8 ? "Moderate" : "Demanding";

  return {
    priceEur: price,
    weightKg: Math.round(weightKg * 100) / 100,
    hardwareAllowanceG: allowance,
    performance: Math.round(clamp(avg("performance") * 10 + weightAdj * 2, 0, 100)),
    comfort: Math.round(avg("comfort") * 10),
    durability: Math.round(avg("durability") * 10),
    climbing: round1(climbing),
    descending: round1(avg("descending")),
    maintenance,
    terrain: terrainFor(discipline, frontTravel),
    frontTravelMm: frontTravel,
    rearTravelMm: rearTravel,
    wheelSize: parts.frame?.compat.wheelSize ?? parts.wheels?.compat.wheelSize,
    drivetrain: parts.groupset ? `${parts.groupset.brand} ${parts.groupset.model}` : undefined,
    brakes: parts.brakes ? `${parts.brakes.brand} ${parts.brakes.model}` : undefined,
    missing,
  };
}

export function terrainFor(discipline: Discipline, forkTravel: number): BuildStats["terrain"] {
  if (discipline === "road") return "Road";
  if (forkTravel === 0) return "XC";
  if (forkTravel <= 120) return "XC";
  if (forkTravel <= 150) return "Trail";
  if (forkTravel <= 160) return "All-Mountain";
  return "Enduro";
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
