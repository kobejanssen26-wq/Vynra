import { categoryMeta } from "../categories";
import { getComponent, listComponents } from "../catalog";
import { candidateStatus, checkCompatibility } from "../compatibility/engine";
import { formatEur, formatGrams } from "../format";
import { computeStats } from "../stats";
import type { BikeComponent, CategoryId, Discipline, PartSelection, Severity, Swap } from "../types";
import { BALANCED, type PreferenceProfile } from "./profiles";

/**
 * Deterministic recommendation engine. Every suggestion is computed from
 * catalog data and the compatibility rules, and carries a human-readable
 * reason built from real deltas (price, grams, ratings, specs).
 */

const DRIVETRAIN: CategoryId[] = ["groupset", "crankset", "cassette", "chain"];

/** Higher is better for the given rider profile. */
export function utility(c: BikeComponent, p: PreferenceProfile = BALANCED): number {
  const r = c.ratings;
  const rated =
    r.performance * p.performance + r.comfort * p.comfort + r.durability * p.durability + r.climbing * p.climbing + r.descending * p.descending;
  return rated - (c.weightG / 1000) * p.weight * 4;
}

export interface Alternative {
  component: BikeComponent;
  status: Severity;
  statusMessage?: string;
  deltaPriceEur: number;
  deltaWeightG: number;
  isCurrent: boolean;
}

/** All catalog options for a category, annotated against the current build. */
export function alternatives(discipline: Discipline, selection: PartSelection, category: CategoryId): Alternative[] {
  const current = getComponent(selection[category]);
  return listComponents(discipline, category)
    .map((component) => {
      const { severity, issues } = candidateStatus(discipline, selection, category, component.id);
      const worstIssue = issues.find((i) => i.severity === severity);
      return {
        component,
        status: severity,
        statusMessage: worstIssue?.message,
        deltaPriceEur: component.priceEur - (current?.priceEur ?? 0),
        deltaWeightG: component.weightG - (current?.weightG ?? 0),
        isCurrent: component.id === current?.id,
      };
    })
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || rank(a.status) - rank(b.status) || a.component.priceEur - b.component.priceEur);
}

const rank = (s: Severity) => ({ ok: 0, info: 0, warning: 1, error: 2 })[s];

/** A move is one or more swaps applied together (e.g. a full drivetrain). */
export interface Move {
  swaps: Swap[];
  deltaPriceEur: number;
  deltaWeightG: number;
  deltaUtility: number;
  title: string;
}

function applySwaps(selection: PartSelection, swaps: Swap[]): PartSelection {
  const next = { ...selection };
  for (const s of swaps) next[s.category] = s.toId;
  return next;
}

/** One-line explanation of a move; packages are described as a unit. */
export function describeMove(m: Move): string {
  if (m.swaps.length === 1) return m.swaps[0].reason;
  const cats = m.swaps.map((s) => s.category);
  const list = cats.length > 1 ? `${cats.slice(0, -1).join(", ")} and ${cats[cats.length - 1]}` : cats[0];
  const money = m.deltaPriceEur < 0 ? `saves ${formatEur(-m.deltaPriceEur)}` : `costs ${formatEur(m.deltaPriceEur)} more`;
  const grams = Math.abs(m.deltaWeightG) < 15 ? "" : m.deltaWeightG < 0 ? ` and is ${formatGrams(-m.deltaWeightG)} lighter` : ` and adds ${formatGrams(m.deltaWeightG)}`;
  return `Switching to a ${m.title} changes the ${list} together (drivetrain parts must belong to the same system); overall it ${money}${grams}.`;
}

export function applyMove(selection: PartSelection, move: Move): PartSelection {
  return applySwaps(selection, move.swaps);
}

const hasNewErrors = (discipline: Discipline, before: PartSelection, after: PartSelection) => {
  const a = checkCompatibility(discipline, before);
  const b = checkCompatibility(discipline, after);
  return b.errorCount > a.errorCount || b.warningCount > a.warningCount;
};

/** Candidate moves: every single-part swap plus coherent drivetrain packages. */
function candidateMoves(
  discipline: Discipline,
  selection: PartSelection,
  profile: PreferenceProfile,
  opts: { exclude?: CategoryId[] } = {},
): Move[] {
  const exclude = new Set<CategoryId>(["frame", ...(opts.exclude ?? [])]);
  const moves: Move[] = [];

  for (const category of Object.keys(selection) as CategoryId[]) {
    if (exclude.has(category)) continue;
    const current = getComponent(selection[category]);
    if (!current) continue;
    for (const cand of listComponents(discipline, category)) {
      if (cand.id === current.id) continue;
      const swap = makeSwap(current, cand, profile);
      const next = applySwaps(selection, [swap]);
      if (hasNewErrors(discipline, selection, next)) continue;
      moves.push(toMove([swap], profile, `${cand.brand} ${cand.model}`));
    }
  }

  // Drivetrain packages: switching ecosystem needs all four parts to change together.
  if (!DRIVETRAIN.some((c) => exclude.has(c))) {
    for (const g of listComponents(discipline, "groupset")) {
      if (g.id === selection.groupset) continue;
      const fam = g.compat.drivetrain;
      const pick = (cat: CategoryId) =>
        listComponents(discipline, cat)
          .filter((c) => c.compat.drivetrain === fam)
          .sort((a, b) => Math.abs(a.tier - g.tier) - Math.abs(b.tier - g.tier) || a.priceEur - b.priceEur)[0];
      const pkg = { groupset: g, crankset: pick("crankset"), cassette: pick("cassette"), chain: pick("chain") };
      if (!pkg.crankset || !pkg.cassette || !pkg.chain) continue;
      const swaps = DRIVETRAIN.flatMap((cat) => {
        const cur = getComponent(selection[cat]);
        const to = pkg[cat as keyof typeof pkg]!;
        return cur?.id === to.id ? [] : [makeSwap(cur, to, profile)];
      });
      // Road brakes are tied to the shifters: move them along if needed.
      const next = applySwaps(selection, swaps);
      if (discipline === "road") {
        const brakes = getComponent(next.brakes);
        if (brakes && brakes.compat.brakeSystem !== g.compat.brakeSystem) {
          const alt = listComponents("road", "brakes")
            .filter((b) => b.compat.brakeSystem === g.compat.brakeSystem)
            .sort((a, b) => Math.abs(a.tier - g.tier) - Math.abs(b.tier - g.tier))[0];
          if (alt) swaps.push(makeSwap(brakes, alt, profile));
        }
      }
      if (swaps.length < 2) continue;
      if (hasNewErrors(discipline, selection, applySwaps(selection, swaps))) continue;
      moves.push(toMove(swaps, profile, `${g.brand} ${g.model.replace(/\s*\(.*\)/, "")} drivetrain`));
    }
  }
  return moves;
}

function toMove(swaps: Swap[], profile: PreferenceProfile, title: string): Move {
  let du = 0;
  for (const s of swaps) du += utility(getComponent(s.toId)!, profile) - (s.fromId ? utility(getComponent(s.fromId)!, profile) : 0);
  return {
    swaps,
    title,
    deltaPriceEur: swaps.reduce((n, s) => n + s.deltaPriceEur, 0),
    deltaWeightG: swaps.reduce((n, s) => n + s.deltaWeightG, 0),
    deltaUtility: du,
  };
}

export function makeSwap(from: BikeComponent | undefined, to: BikeComponent, profile: PreferenceProfile = BALANCED): Swap {
  return {
    category: to.category,
    fromId: from?.id,
    toId: to.id,
    deltaPriceEur: to.priceEur - (from?.priceEur ?? 0),
    deltaWeightG: to.weightG - (from?.weightG ?? 0),
    reason: explainSwap(from, to, profile),
  };
}

// ─── Explanations ──────────────────────────────────────────────────────────

const RATING_LABEL: Record<keyof BikeComponent["ratings"], string> = {
  performance: "performance",
  comfort: "comfort",
  durability: "durability",
  climbing: "climbing",
  descending: "descending",
};

/** Plain-language comparison between two parts, using only catalog data. */
export function explainSwap(from: BikeComponent | undefined, to: BikeComponent, profile: PreferenceProfile = BALANCED): string {
  const toName = `${to.brand} ${to.model}`;
  if (!from) return `Adds the ${toName} (${formatEur(to.priceEur)}, ${formatGrams(to.weightG)}). ${to.summary}`;

  const dp = to.priceEur - from.priceEur;
  const dg = to.weightG - from.weightG;
  const money = dp < 0 ? `saves ${formatEur(-dp)}` : dp > 0 ? `costs ${formatEur(dp)} more` : "costs the same";
  const grams = Math.abs(dg) < 15 ? "" : dg < 0 ? `is ${formatGrams(-dg)} lighter` : `adds ${formatGrams(dg)}`;

  // The two rating changes that matter most for this rider.
  const changes = (Object.keys(RATING_LABEL) as (keyof typeof RATING_LABEL)[])
    .map((k) => ({ k, d: to.ratings[k] - from.ratings[k], w: profile[k] }))
    .filter((x) => Math.abs(x.d) >= 0.5)
    .sort((a, b) => Math.abs(b.d * b.w) - Math.abs(a.d * a.w))
    .slice(0, 2);
  const better = changes.filter((c) => c.d > 0).map((c) => `${RATING_LABEL[c.k]} (${to.ratings[c.k]} vs ${from.ratings[c.k]})`);
  const worse = changes.filter((c) => c.d < 0).map((c) => `${RATING_LABEL[c.k]}`);

  const spec = specDelta(from, to);
  const parts = [`Switching to the ${toName} ${money}`];
  if (grams) parts.push(grams);
  let s = parts.join(" and ");
  if (spec) s += `; ${spec}`;
  if (better.length) s += `, with better ${better.join(" and ")}`;
  if (worse.length) s += `${better.length ? ", but" : ", while"} giving up some ${worse.join(" and ")}`;
  else if (!better.length && dp < 0) s += " while keeping similar performance";
  return s + ".";
}

function specDelta(from: BikeComponent, to: BikeComponent): string {
  const a = from.compat;
  const b = to.compat;
  if (to.category === "fork" && a.travelMm !== undefined && b.travelMm !== undefined && a.travelMm !== b.travelMm) {
    return `travel goes from ${a.travelMm} to ${b.travelMm} mm`;
  }
  if (to.category === "tires" && a.tireWidthMm && b.tireWidthMm && a.tireWidthMm !== b.tireWidthMm) {
    const inch = (mm: number) => (to.disciplines.includes("mtb") ? `${(mm / 25.4).toFixed(1)}"` : `${mm} mm`);
    return `width goes from ${inch(a.tireWidthMm)} to ${inch(b.tireWidthMm)}`;
  }
  if (to.category === "brakes" && a.rotorsMm && b.rotorsMm && a.rotorsMm[0] !== b.rotorsMm[0]) {
    return `front rotor goes from ${a.rotorsMm[0]} to ${b.rotorsMm[0]} mm`;
  }
  return "";
}

/** "AI opinion" shown in the component detail panel. */
export function componentOpinion(
  discipline: Discipline,
  selection: PartSelection,
  candidate: BikeComponent,
  profile: PreferenceProfile = BALANCED,
): string {
  const current = getComponent(selection[candidate.category]);
  const { severity, issues } = candidateStatus(discipline, selection, candidate.category, candidate.id);
  if (current?.id === candidate.id) {
    const others = listComponents(discipline, candidate.category).filter((c) => c.id !== candidate.id);
    const better = others.filter((o) => utility(o, profile) > utility(candidate, profile) && o.priceEur <= candidate.priceEur);
    return better.length
      ? `This is your current ${categoryMeta(candidate.category).label.toLowerCase()}. ${better[0].brand} ${better[0].model} scores higher for your riding profile at the same or lower price — worth a look.`
      : `This is your current ${categoryMeta(candidate.category).label.toLowerCase()}, and it is the best-scoring option at its price for your riding profile. ${candidate.summary}`;
  }
  let text = explainSwap(current, candidate, profile);
  if (severity === "error") text += ` However, it is not compatible with your build: ${issues.find((i) => i.severity === "error")?.message}`;
  else if (severity === "warning") text += ` Note: ${issues.find((i) => i.severity === "warning")?.message}`;
  return text;
}

// ─── Upgrade suggestions ───────────────────────────────────────────────────

export interface UpgradeSuggestion extends Move {
  headline: string;
  benefit: string;
}

export function suggestUpgrades(
  discipline: Discipline,
  selection: PartSelection,
  profile: PreferenceProfile = BALANCED,
  limit = 4,
): UpgradeSuggestion[] {
  const moves = candidateMoves(discipline, selection, profile).filter(
    (m) => m.deltaPriceEur > 0 && m.swaps.length === 1 && (m.deltaUtility > 1 || (m.deltaWeightG < -60 && m.deltaUtility > 0.75)),
  );
  // Value = utility gained (plus weight saved) per €100 spent.
  const value = (m: Move) => (m.deltaUtility + Math.max(0, -m.deltaWeightG) / 100) / (m.deltaPriceEur / 100);
  const best = new Map<CategoryId, Move>();
  for (const m of moves.sort((a, b) => value(b) - value(a))) {
    const cat = m.swaps[0].category;
    if (!best.has(cat)) best.set(cat, m);
  }
  return [...best.values()]
    .sort((a, b) => value(b) - value(a))
    .slice(0, limit)
    .map((m) => {
      const s = m.swaps[0];
      const to = getComponent(s.toId)!;
      const from = getComponent(s.fromId);
      const lighter = -m.deltaWeightG;
      const top = from
        ? (Object.keys(RATING_LABEL) as (keyof typeof RATING_LABEL)[])
            .map((k) => ({ k, d: to.ratings[k] - from.ratings[k] }))
            .sort((a, b) => b.d - a.d)[0]
        : undefined;
      const benefit =
        lighter >= 60
          ? `Saves ${formatGrams(lighter)}`
          : top && top.d > 0
            ? `Better ${RATING_LABEL[top.k]} (${to.ratings[top.k]} vs ${from!.ratings[top.k]})`
            : "Higher overall rating";
      return { ...m, headline: `${to.brand} ${to.model}`, benefit };
    });
}

// ─── Budget optimizer ──────────────────────────────────────────────────────

export interface BudgetResult {
  moves: Move[];
  selection: PartSelection;
  startPriceEur: number;
  endPriceEur: number;
  reached: boolean;
}

/**
 * Greedy optimizer: repeatedly applies the swap that saves the most money per
 * unit of lost "utility" until the build fits the budget. The frame is kept.
 */
export function fitBudget(
  discipline: Discipline,
  selection: PartSelection,
  budgetEur: number,
  profile: PreferenceProfile = BALANCED,
): BudgetResult {
  const start = computeStats(discipline, selection).priceEur;
  let sel = { ...selection };
  let price = start;
  const applied: Move[] = [];
  const touched = new Set<CategoryId>();

  for (let i = 0; i < 12 && price > budgetEur; i++) {
    const overshoot = price - budgetEur;
    const moves = candidateMoves(discipline, sel, profile, { exclude: [...touched] }).filter(
      (m) => m.deltaPriceEur < 0 && !m.swaps.some(isMajorRegression),
    );
    if (!moves.length) break;
    const cost = (m: Move) => {
      const loss = Math.max(0, -m.deltaUtility) + 0.5;
      // Prefer moves that close the gap without overshooting it massively.
      const saving = Math.min(-m.deltaPriceEur, overshoot + 150);
      return saving / loss;
    };
    const best = moves.sort((a, b) => cost(b) - cost(a))[0];
    sel = applyMove(sel, best);
    price += best.deltaPriceEur;
    applied.push(best);
    best.swaps.forEach((s) => touched.add(s.category));
  }
  return { moves: applied, selection: sel, startPriceEur: start, endPriceEur: price, reached: price <= budgetEur };
}

/**
 * A swap that drops any rating by 3+ points changes what the part is for
 * (e.g. dropper → rigid post, enduro → XC tire). The optimizer never picks those.
 */
function isMajorRegression(s: Swap): boolean {
  const from = getComponent(s.fromId);
  const to = getComponent(s.toId)!;
  if (!from) return false;
  return (Object.keys(to.ratings) as (keyof typeof to.ratings)[]).some((k) => from.ratings[k] - to.ratings[k] >= 3);
}

/** Best compatible pick per category for a rider profile (used for style advice). */
export function bestFor(
  discipline: Discipline,
  selection: PartSelection,
  category: CategoryId,
  profile: PreferenceProfile,
  filter: (c: BikeComponent) => boolean = () => true,
): Move | undefined {
  const current = getComponent(selection[category]);
  return candidateMoves(discipline, selection, profile)
    .filter((m) => m.swaps.length === 1 && m.swaps[0].category === category && filter(getComponent(m.swaps[0].toId)!))
    .filter((m) => m.deltaUtility > 0.5 || !current)
    .sort((a, b) => b.deltaUtility - a.deltaUtility)[0];
}
