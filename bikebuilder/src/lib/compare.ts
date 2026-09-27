import { resolveParts } from "./compatibility/engine";
import { formatEur, formatGrams } from "./format";
import { computeStats } from "./stats";
import type { BuildStats, Discipline, PartSelection } from "./types";

export interface ComparableBuild {
  id: string;
  name: string;
  discipline: Discipline;
  parts: PartSelection;
}

/**
 * Factual comparison summary. Every sentence is derived from computed stats or
 * catalog specs of the two builds — nothing is inferred beyond that data.
 */
export function analyzeComparison(a: ComparableBuild, b: ComparableBuild): string[] {
  const sa = computeStats(a.discipline, a.parts);
  const sb = computeStats(b.discipline, b.parts);
  const pa = resolveParts(a.parts);
  const pb = resolveParts(b.parts);
  const out: string[] = [];
  const A = a.name;
  const B = b.name;

  if (a.discipline !== b.discipline) {
    out.push(`${A} is a ${a.discipline === "mtb" ? "mountain" : "road"} bike and ${B} is a ${b.discipline === "mtb" ? "mountain" : "road"} bike, so most differences come from their intended use rather than component choice.`);
  }

  const dKg = sb.weightKg - sa.weightKg;
  const dEur = sb.priceEur - sa.priceEur;
  if (Math.abs(dKg) >= 0.1) {
    const lighter = dKg > 0 ? A : B;
    out.push(`${lighter} is ${Math.abs(dKg).toFixed(1)} kg lighter (${Math.min(sa.weightKg, sb.weightKg).toFixed(1)} vs ${Math.max(sa.weightKg, sb.weightKg).toFixed(1)} kg, including an estimate for small parts).`);
  }
  if (Math.abs(dEur) >= 50) {
    const cheaper = dEur > 0 ? A : B;
    out.push(`${cheaper} costs ${formatEur(Math.abs(dEur))} less at indicative catalog prices (${formatEur(Math.min(sa.priceEur, sb.priceEur))} vs ${formatEur(Math.max(sa.priceEur, sb.priceEur))}).`);
  }

  if (a.discipline === "mtb" && b.discipline === "mtb") {
    const travel = (s: BuildStats) => `${s.frontTravelMm} mm front / ${s.rearTravelMm ? `${s.rearTravelMm} mm rear` : "hardtail"}`;
    if (sa.frontTravelMm !== sb.frontTravelMm || sa.rearTravelMm !== sb.rearTravelMm) {
      const more = sa.frontTravelMm + sa.rearTravelMm > sb.frontTravelMm + sb.rearTravelMm ? A : B;
      out.push(`${more} has more suspension travel (${A}: ${travel(sa)}; ${B}: ${travel(sb)}), which favours rough descents over climbing efficiency.`);
    }
    const ta = pa.tires?.compat.tireWidthMm;
    const tb = pb.tires?.compat.tireWidthMm;
    if (ta && tb && ta !== tb) out.push(`Tires: ${pa.tires!.model} (${A}) vs ${pb.tires!.model} (${B}).`);
  }

  const ra = pa.brakes?.compat.rotorsMm;
  const rb = pb.brakes?.compat.rotorsMm;
  if (ra && rb && ra[0] !== rb[0]) {
    out.push(`Front rotor: ${ra[0]} mm on ${A} vs ${rb[0]} mm on ${B}; larger rotors give more braking power and heat capacity.`);
  }

  if (sa.drivetrain && sb.drivetrain && sa.drivetrain !== sb.drivetrain) {
    out.push(`Drivetrain: ${sa.drivetrain} (${A}) vs ${sb.drivetrain} (${B}).`);
  }

  const orient = (s: BuildStats) => (s.climbing - s.descending >= 0.8 ? "climbing and efficiency" : s.descending - s.climbing >= 0.8 ? "descending and control" : "a balance of climbing and descending");
  out.push(`By component ratings, ${A} is oriented toward ${orient(sa)} (climbing ${sa.climbing}/10, descending ${sa.descending}/10), and ${B} toward ${orient(sb)} (climbing ${sb.climbing}/10, descending ${sb.descending}/10).`);

  if (sa.comfort !== sb.comfort) {
    out.push(`${sa.comfort > sb.comfort ? A : B} scores higher for comfort (${Math.max(sa.comfort, sb.comfort)}% vs ${Math.min(sa.comfort, sb.comfort)}%).`);
  }

  const lightest = (p: ReturnType<typeof resolveParts>) => (p.wheels ? `${p.wheels.brand} ${p.wheels.model} (${formatGrams(p.wheels.weightG)})` : "—");
  if (pa.wheels?.id !== pb.wheels?.id) out.push(`Wheels: ${lightest(pa)} vs ${lightest(pb)}.`);

  return out;
}
