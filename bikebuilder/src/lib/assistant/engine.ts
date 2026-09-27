import { getComponent, listComponents } from "../catalog";
import { checkCompatibility } from "../compatibility/engine";
import { formatEur, formatGrams, formatKg } from "../format";
import { bestFor, describeMove, fitBudget, makeSwap, suggestUpgrades, type Move } from "../recommend/engine";
import {
  BALANCED,
  defaultStyle,
  mergeProfile,
  STYLE_LABEL,
  STYLE_PROFILES,
  STYLE_TRAVEL,
  type PreferenceProfile,
  type RidingStyle,
} from "../recommend/profiles";
import { computeStats } from "../stats";
import type { CategoryId, Discipline, PartSelection, Swap } from "../types";

/**
 * Rule-based build assistant.
 *
 * It parses budget, riding style and preferences out of free text and answers
 * with swaps computed by the recommendation engine. It is deliberately
 * deterministic: every number it quotes comes from the catalog. An LLM provider
 * can be layered on top (see lib/assistant/provider.ts) to improve language
 * understanding while still grounding suggestions in this engine.
 */

export interface AssistantRequest {
  discipline: Discipline;
  selection: PartSelection;
  message: string;
  /** Preferences remembered from earlier in the conversation. */
  context?: AssistantContext;
}

export interface AssistantContext {
  style?: RidingStyle;
  budgetEur?: number;
  priorities?: Priority[];
}

export type Priority = "weight" | "comfort" | "durability" | "performance" | "value";

export interface AssistantReply {
  text: string;
  /** Proposed changes; the UI lets the user apply them. */
  swaps: Swap[];
  context: AssistantContext;
  /** Parsed intents — shown as chips so users see what was understood. */
  understood: string[];
  provider: "rules" | "llm";
}

// ─── Parsing ───────────────────────────────────────────────────────────────

export function parseBudget(text: string): number | undefined {
  const t = text.toLowerCase().replace(/(\d)[.,\s](\d{3})\b/g, "$1$2");
  const k = t.match(/(?:€|eur|euro)?\s*(\d+(?:[.,]\d+)?)\s*k\b/);
  if (k) return Math.round(parseFloat(k[1].replace(",", ".")) * 1000);
  const m =
    t.match(/€\s*(\d{3,6})/) ??
    t.match(/(\d{3,6})\s*(?:€|eur|euro)/) ??
    t.match(/(?:budget|max(?:imum)?|under|below|spend|up to)\D{0,15}(\d{3,6})/);
  return m ? parseInt(m[1], 10) : undefined;
}

const STYLE_WORDS: [RegExp, RidingStyle][] = [
  [/\b(enduro|bike ?park|downhill|dh|gravity|freeride|jumps?)\b/, "enduro"],
  [/\b(xc|cross[- ]?country|marathon|race|racing|races|lightweight racer)\b/, "xc"],
  [/\b(trails?|singletrack|all[- ]?round|flow)\b/, "trail"],
  [/\b(endurance|sportive|gran fondo|long rides?|comfort(?:able)? road)\b/, "endurance"],
  [/\b(crit|criterium|road rac(?:e|ing)|aero)\b/, "road-race"],
];

const PRIORITY_WORDS: [RegExp, Priority][] = [
  [/\b(light(?:er|est)?|weight|grams?|weigh)\b/, "weight"],
  [/\b(comfort(?:able)?|smooth|plush|back pain|hands? hurt)\b/, "comfort"],
  [/\b(durab(?:le|ility)|reliab(?:le|ility)|low maintenance|maintenance|last(?:s|ing)?)\b/, "durability"],
  [/\b(fast(?:er)?|performance|speed|stiff(?:er)?|quick(?:er)?)\b/, "performance"],
  [/\b(cheap(?:er)?|save money|cost|value|afford)\b/, "value"],
];

export function parseStyle(text: string, discipline: Discipline): RidingStyle | undefined {
  const t = text.toLowerCase();
  for (const [re, style] of STYLE_WORDS) {
    if (!re.test(t)) continue;
    if (discipline === "road") {
      if (style === "xc") return "road-race";
      if (style === "trail" || style === "enduro") return undefined;
    } else if (style === "road-race" || style === "endurance") {
      return undefined;
    }
    return style;
  }
  return undefined;
}

export function parsePriorities(text: string): Priority[] {
  const t = text.toLowerCase();
  return PRIORITY_WORDS.filter(([re]) => re.test(t)).map(([, p]) => p);
}

function profileFor(style: RidingStyle | undefined, priorities: Priority[]): PreferenceProfile {
  let p = style ? STYLE_PROFILES[style] : BALANCED;
  for (const pr of priorities) {
    if (pr === "weight") p = mergeProfile(p, { weight: 1.2, climbing: 0.4 });
    if (pr === "comfort") p = mergeProfile(p, { comfort: 1.2 });
    if (pr === "durability") p = mergeProfile(p, { durability: 1.2 });
    if (pr === "performance") p = mergeProfile(p, { performance: 1 });
  }
  return p;
}

// ─── Replies ───────────────────────────────────────────────────────────────

/** Riding-style knowledge, phrased as reasons rather than bare recommendations. */
const STYLE_RATIONALE: Partial<Record<RidingStyle, Partial<Record<CategoryId, string>>>> = {
  trail: {
    tires: "A 2.4–2.5\" trail tread adds cornering and braking grip on roots and rocks; a 2.4\" width does this without a large rolling-resistance penalty.",
    brakes: "Four-piston brakes with a 200/203 mm front rotor keep lever feel consistent on longer descents.",
    handlebar: "A carbon bar with built-in compliance reduces hand fatigue on rough trails.",
  },
  xc: {
    tires: "Fast-rolling, light tires make the biggest difference to acceleration and climbing speed.",
    fork: "A 100–120 mm fork keeps the front end low and efficient for climbing.",
    seatpost: "A rigid post saves weight if your courses aren't very technical.",
  },
  enduro: {
    tires: "Wider, tougher tires resist pinch flats and give more traction at speed.",
    brakes: "Enduro descents need large rotors and four-piston calipers to manage heat.",
    fork: "A stiffer, longer-travel fork keeps steering precise on big hits.",
  },
  "road-race": {
    wheels: "Deeper-section wheels save the most watts at race speeds.",
    tires: "Supple 28 mm race tires are typically faster than narrower ones on real roads.",
  },
  endurance: {
    tires: "Wider 30–32 mm tires at lower pressure are more comfortable and just as fast on rough roads.",
    saddle: "A saddle with pressure relief matters more than weight on long rides.",
  },
};

const STYLE_CATEGORIES: Record<RidingStyle, CategoryId[]> = {
  trail: ["tires", "brakes", "handlebar", "fork"],
  xc: ["tires", "fork", "wheels", "seatpost"],
  enduro: ["tires", "brakes", "fork", "wheels"],
  "road-race": ["wheels", "tires", "handlebar"],
  endurance: ["tires", "saddle", "wheels"],
};

function styleAdvice(discipline: Discipline, selection: PartSelection, style: RidingStyle, profile: PreferenceProfile) {
  const lines: string[] = [];
  const swaps: Swap[] = [];
  let sel = { ...selection };
  for (const cat of STYLE_CATEGORIES[style]) {
    const travel = STYLE_TRAVEL[style];
    const filter =
      cat === "fork" && travel
        ? (c: { compat: { travelMm?: number } }) => (c.compat.travelMm ?? 0) >= travel[0] && (c.compat.travelMm ?? 0) <= travel[1]
        : undefined;
    const move = bestFor(discipline, sel, cat, profile, filter);
    if (!move) continue;
    const s = move.swaps[0];
    const from = getComponent(s.fromId);
    const to = getComponent(s.toId);
    // Only cite the brake rationale when the swap actually adds rotor size.
    const why =
      cat === "brakes" && (to?.compat.rotorsMm?.[0] ?? 0) <= (from?.compat.rotorsMm?.[0] ?? 0)
        ? undefined
        : STYLE_RATIONALE[style]?.[cat];
    swaps.push(s);
    sel = { ...sel, [s.category]: s.toId };
    lines.push(`• ${why ? `${why} ` : ""}${s.reason}`);
    if (swaps.length >= 3) break;
  }
  return { lines, swaps };
}

function summarizeMoves(moves: Move[]): string[] {
  return moves.map((m) => `• ${describeMove(m)}`);
}

export function respond(req: AssistantRequest): AssistantReply {
  const { discipline, selection, message } = req;
  const ctx: AssistantContext = { ...req.context };
  const stats = computeStats(discipline, selection);
  const understood: string[] = [];

  const budget = parseBudget(message);
  const style = parseStyle(message, discipline);
  const priorities = parsePriorities(message);
  if (budget) {
    ctx.budgetEur = budget;
    understood.push(`Budget ${formatEur(budget)}`);
  }
  if (style) {
    ctx.style = style;
    understood.push(`Style: ${STYLE_LABEL[style]}`);
  }
  if (priorities.length) {
    ctx.priorities = Array.from(new Set([...(ctx.priorities ?? []), ...priorities]));
    understood.push(...priorities.map((p) => `Priority: ${p}`));
  }

  const activeStyle = ctx.style ?? defaultStyle(discipline, stats.frontTravelMm);
  const profile = profileFor(activeStyle, ctx.priorities ?? []);
  const lower = message.toLowerCase();
  const base = { context: ctx, understood, provider: "rules" as const };

  if (!Object.keys(selection).length) {
    return { ...base, swaps: [], text: "Start by choosing a frame — everything else is checked against it (wheel size, fork travel, brake mounts, seatpost fit)." };
  }

  // 1. Budget
  if (budget) {
    if (stats.priceEur <= budget) {
      const headroom = budget - stats.priceEur;
      const ups = suggestUpgrades(discipline, selection, profile, 6).filter((u) => u.deltaPriceEur <= headroom);
      const pick: Move[] = [];
      let left = headroom;
      for (const u of ups) if (u.deltaPriceEur <= left) (pick.push(u), (left -= u.deltaPriceEur));
      return {
        ...base,
        swaps: pick.flatMap((m) => m.swaps),
        text:
          `Your build is ${formatEur(stats.priceEur)}, which leaves ${formatEur(headroom)} of your ${formatEur(budget)} budget.` +
          (pick.length
            ? ` The upgrades with the best value for ${STYLE_LABEL[activeStyle]}:\n${summarizeMoves(pick).join("\n")}`
            : " Nothing in the catalog is a clear upgrade within that headroom."),
      };
    }
    const r = fitBudget(discipline, selection, budget, profile);
    const after = computeStats(discipline, r.selection);
    const head = `Your build is ${formatEur(r.startPriceEur)} — ${formatEur(r.startPriceEur - budget)} over your ${formatEur(budget)} budget.`;
    if (!r.moves.length) {
      return { ...base, swaps: [], text: `${head} I couldn't find compatible swaps that lower the price without changing the frame. Try a less expensive frame first.` };
    }
    const tail = r.reached
      ? `That brings it to ${formatEur(r.endPriceEur)} (${formatKg(after.weightKg)}, performance ${after.performance}/100 vs ${stats.performance}/100). The frame stays the same.`
      : `That gets it to ${formatEur(r.endPriceEur)}, still ${formatEur(r.endPriceEur - budget)} over. The remaining cost is mostly in the frame (${formatEur(getComponent(selection.frame)?.priceEur ?? 0)}); a less expensive frame is the next lever.`;
    return {
      ...base,
      swaps: r.moves.flatMap((m) => m.swaps),
      text: `${head} Here's the smallest performance sacrifice for ${STYLE_LABEL[activeStyle]}:\n${summarizeMoves(r.moves).join("\n")}\n${tail}`,
    };
  }

  // 2. Compatibility questions
  if (/\b(compatib|fit|work together|issue|problem|conflict)\w*/.test(lower)) {
    const rep = checkCompatibility(discipline, selection);
    if (!rep.issues.length) return { ...base, swaps: [], text: `All ${rep.rules.filter((r) => r.applicable).length} applicable compatibility checks pass.` };
    const fixes: Swap[] = [];
    for (const i of rep.issues.filter((x) => x.severity === "error")) {
      const cat = i.categories.find((c) => c !== "frame") ?? i.categories[0];
      const cur = getComponent(selection[cat]);
      const alt = listComponents(discipline, cat)
        .map((c) => ({ c, next: { ...selection, [cat]: c.id } }))
        .filter(({ next }) => checkCompatibility(discipline, next).errorCount < rep.errorCount)
        .sort((a, b) => Math.abs(a.c.priceEur - (cur?.priceEur ?? 0)) - Math.abs(b.c.priceEur - (cur?.priceEur ?? 0)))[0];
      if (alt && !fixes.some((f) => f.category === cat)) fixes.push(makeSwap(cur, alt.c, profile));
    }
    return {
      ...base,
      swaps: fixes,
      text:
        `I found ${rep.errorCount} error(s) and ${rep.warningCount} warning(s):\n` +
        rep.issues.filter((i) => i.severity !== "info").map((i) => `• ${i.message}${i.fix ? ` ${i.fix}` : ""}`).join("\n") +
        (fixes.length ? "\nClosest compatible replacements are below." : ""),
    };
  }

  // 3. Riding style
  if (style) {
    const { lines, swaps } = styleAdvice(discipline, selection, style, profile);
    return {
      ...base,
      swaps,
      text: lines.length
        ? `For ${STYLE_LABEL[style]}, here's what I'd change and why:\n${lines.join("\n")}`
        : `Your build is already well matched to ${STYLE_LABEL[style]} — nothing in the catalog scores clearly higher for that style without breaking compatibility.`,
    };
  }

  // 4. Priorities (lighter, comfier, cheaper…)
  if (priorities.includes("value")) {
    const target = Math.round((stats.priceEur * 0.85) / 50) * 50;
    const r = fitBudget(discipline, selection, target, profile);
    return {
      ...base,
      swaps: r.moves.flatMap((m) => m.swaps),
      text: r.moves.length
        ? `To save around 15% (${formatEur(stats.priceEur - target)}) with the least impact:\n${summarizeMoves(r.moves).join("\n")}`
        : "I couldn't find compatible swaps that save money without changing the frame.",
    };
  }
  if (priorities.length) {
    const ups = suggestUpgrades(discipline, selection, profile, 3);
    const main = priorities[0];
    const filtered = main === "weight" ? ups.filter((u) => u.deltaWeightG < 0) : ups;
    return {
      ...base,
      swaps: filtered.flatMap((m) => m.swaps),
      text: filtered.length
        ? `Focusing on ${main}, these give the most benefit per euro:\n${summarizeMoves(filtered).join("\n")}`
        : `Your build is already strong on ${main} for its price.`,
    };
  }

  // 5. Summary / help
  return {
    ...base,
    swaps: [],
    text:
      `Your ${discipline === "mtb" ? "mountain bike" : "road bike"} is ${formatEur(stats.priceEur)} and ${formatKg(stats.weightKg)} ` +
      `(incl. ≈${formatGrams(stats.hardwareAllowanceG)} of small parts), set up for ${stats.terrain.toLowerCase()} riding.\n` +
      `Tell me your budget ("my budget is €3,000"), how you ride ("I mainly ride trails"), or what matters most ("lighter", "more comfortable", "low maintenance") and I'll suggest specific, compatible changes with the reasoning behind each.`,
  };
}
