import { getComponent } from "../catalog";
import type {
  BikeComponent,
  CategoryId,
  CompatibilityIssue,
  Discipline,
  PartSelection,
  Severity,
} from "../types";

type Parts = Partial<Record<CategoryId, BikeComponent>>;

interface RuleContext {
  discipline: Discipline;
  parts: Parts;
}

export interface Rule {
  id: string;
  label: string;
  /** Categories this rule inspects — used to show which checks passed. */
  categories: CategoryId[];
  check: (ctx: RuleContext) => CompatibilityIssue[];
}

const name = (c: BikeComponent) => `${c.brand} ${c.model}`;

const issue = (
  ruleId: string,
  severity: CompatibilityIssue["severity"],
  categories: CategoryId[],
  message: string,
  fix?: string,
): CompatibilityIssue => ({ ruleId, severity, categories, message, fix });

const FAMILY_LABEL: Record<string, string> = {
  "sram-transmission": "SRAM Eagle Transmission (T-Type)",
  "sram-eagle": "SRAM Eagle",
  "shimano-mtb-12": "Shimano 12-speed MTB",
  "shimano-road-12": "Shimano 12-speed road",
  "sram-road-axs": "SRAM AXS road",
};

/**
 * Compatibility rules. Each rule only fires when both sides expose the data it
 * needs, so an incomplete catalog entry never produces a false error.
 */
export const RULES: Rule[] = [
  {
    id: "discipline",
    label: "Parts match the bike type",
    categories: [],
    check: ({ discipline, parts }) =>
      Object.values(parts)
        .filter((c): c is BikeComponent => !!c && !c.disciplines.includes(discipline))
        .map((c) =>
          issue(
            "discipline",
            "error",
            [c.category],
            `${name(c)} is not designed for a ${discipline === "mtb" ? "mountain" : "road"} bike.`,
            `Pick a ${discipline === "mtb" ? "mountain bike" : "road"} ${c.category}.`,
          ),
        ),
  },
  {
    id: "frame-specific",
    label: "Frame-specific parts match the frame",
    categories: ["frame", "fork"],
    check: ({ parts }) => {
      const frame = parts.frame;
      if (!frame) return [];
      return Object.values(parts)
        .filter((c): c is BikeComponent => !!c?.compat.onlyFitsFrames && !c.compat.onlyFitsFrames.includes(frame.id))
        .map((c) =>
          issue("frame-specific", "error", [c.category, "frame"], `${name(c)} only fits its own frameset, not the ${frame.model}.`, `Use the fork supplied with the ${frame.model}.`),
        );
    },
  },
  {
    id: "wheel-size",
    label: "Wheel size is consistent",
    categories: ["frame", "fork", "wheels", "tires"],
    check: ({ parts }) => {
      const ref = parts.frame?.compat.wheelSize;
      if (!ref) return [];
      const out: CompatibilityIssue[] = [];
      for (const cat of ["fork", "wheels", "tires"] as const) {
        const c = parts[cat];
        const size = c?.compat.wheelSize;
        if (c && size && size !== ref) {
          out.push(issue("wheel-size", "error", ["frame", cat], `${name(c)} is ${size}" but the frame takes ${ref}" wheels.`, `Choose a ${ref}" ${cat}.`));
        }
      }
      return out;
    },
  },
  {
    id: "fork-travel",
    label: "Fork travel fits frame geometry",
    categories: ["frame", "fork"],
    check: ({ parts, discipline }) => {
      const range = parts.frame?.compat.forkTravelRange;
      const fork = parts.fork;
      const travel = fork?.compat.travelMm;
      if (discipline !== "mtb" || !range || !fork || travel === undefined) return [];
      const [min, max] = range;
      if (travel >= min && travel <= max) return [];
      const off = travel > max ? travel - max : min - travel;
      const dir = travel > max ? "more" : "less";
      // Rule of thumb: ±10 mm travel ≈ ±0.5° head angle.
      const deg = ((off / 10) * 0.5).toFixed(1);
      return [
        issue(
          "fork-travel",
          off <= 10 ? "warning" : "error",
          ["frame", "fork"],
          `${fork.model} has ${travel} mm travel — ${off} mm ${dir} than the frame's ${min}–${max} mm design range (≈${deg}° head-angle change).`,
          off <= 10 ? "Acceptable for many riders, but check the frame warranty." : `Choose a fork with ${min}–${max} mm of travel.`,
        ),
      ];
    },
  },
  {
    id: "tire-clearance",
    label: "Tires clear frame and fork",
    categories: ["tires", "frame", "fork"],
    check: ({ parts }) => {
      const tire = parts.tires;
      const w = tire?.compat.tireWidthMm;
      if (!tire || !w) return [];
      const out: CompatibilityIssue[] = [];
      for (const cat of ["frame", "fork"] as const) {
        const max = parts[cat]?.compat.maxTireMm;
        if (max && w > max) {
          out.push(issue("tire-clearance", "error", ["tires", cat], `${tire.model} is ${w} mm wide; the ${cat} clears ${max} mm.`, `Choose a tire of ${max} mm or narrower.`));
        }
      }
      return out;
    },
  },
  {
    id: "udh",
    label: "Derailleur mount (UDH)",
    categories: ["frame", "groupset"],
    check: ({ parts }) => {
      const g = parts.groupset;
      const f = parts.frame;
      if (!g?.compat.requiresUdh || !f || f.compat.udh) return [];
      return [issue("udh", "error", ["frame", "groupset"], `${name(g)} mounts directly to the frame and needs a UDH frame; the ${f.model} does not have one.`, "Choose a hanger-mounted groupset or a UDH frame.")];
    },
  },
  {
    id: "drivetrain-family",
    label: "Drivetrain parts belong together",
    categories: ["groupset", "crankset", "cassette", "chain"],
    check: ({ parts }) => {
      const g = parts.groupset;
      const fam = g?.compat.drivetrain;
      if (!g || !fam) return [];
      const out: CompatibilityIssue[] = [];
      for (const cat of ["crankset", "cassette", "chain"] as const) {
        const c = parts[cat];
        const other = c?.compat.drivetrain;
        if (!c || !other || other === fam) continue;
        const involvesTransmission = fam === "sram-transmission" || other === "sram-transmission";
        const road = fam.includes("road") || other.includes("road");
        // Mixing Shimano and non-T-Type SRAM Eagle 12s parts is widely done but not officially supported.
        const severity = involvesTransmission || road ? "error" : "warning";
        out.push(
          issue(
            "drivetrain-family",
            severity,
            ["groupset", cat],
            severity === "error"
              ? `${name(c)} (${FAMILY_LABEL[other]}) does not work with a ${FAMILY_LABEL[fam]} groupset.`
              : `${name(c)} (${FAMILY_LABEL[other]}) is not officially supported with ${FAMILY_LABEL[fam]}; shifting quality may suffer.`,
            `Choose a ${FAMILY_LABEL[fam]} ${cat}.`,
          ),
        );
      }
      return out;
    },
  },
  {
    id: "speeds",
    label: "Number of speeds matches",
    categories: ["groupset", "cassette", "chain"],
    check: ({ parts }) => {
      const s = parts.groupset?.compat.speeds;
      if (!s) return [];
      return (["cassette", "chain"] as const)
        .filter((cat) => parts[cat]?.compat.speeds && parts[cat]!.compat.speeds !== s)
        .map((cat) => issue("speeds", "error", ["groupset", cat], `${parts[cat]!.model} is ${parts[cat]!.compat.speeds}-speed; the groupset is ${s}-speed.`));
    },
  },
  {
    id: "freehub",
    label: "Cassette fits the freehub",
    categories: ["wheels", "cassette"],
    check: ({ parts }) => {
      const w = parts.wheels;
      const cs = parts.cassette;
      const need = cs?.compat.freehub;
      const opts = w?.compat.freehubOptions;
      if (!w || !cs || !need || !opts) return [];
      if (!opts.includes(need)) {
        return [issue("freehub", "error", ["wheels", "cassette"], `${cs.model} needs a ${need} freehub; ${w.model} is only available with ${opts.join(" / ")}.`, `Choose a wheelset offered with a ${need} freehub, or a ${opts[0]} cassette.`)];
      }
      if (opts.length > 1) {
        return [issue("freehub", "info", ["wheels", "cassette"], `Order the ${w.model} with a ${need} freehub body for the ${cs.model}.`)];
      }
      return [];
    },
  },
  {
    id: "brake-system",
    label: "Brake calipers match the levers",
    categories: ["groupset", "brakes"],
    check: ({ parts, discipline }) => {
      // Road hydraulic levers are part of the shifters, so caliper and groupset must share a system.
      if (discipline !== "road") return [];
      const g = parts.groupset?.compat.brakeSystem;
      const b = parts.brakes;
      if (!g || !b?.compat.brakeSystem || b.compat.brakeSystem === g) return [];
      return [issue("brake-system", "error", ["groupset", "brakes"], `${b.model} calipers can't be used with ${parts.groupset!.brand} hydraulic shift levers (different fluid and system).`, `Choose ${parts.groupset!.brand} brake calipers.`)];
    },
  },
  {
    id: "brake-mount",
    label: "Brake caliper mounts",
    categories: ["frame", "fork", "brakes"],
    check: ({ parts }) => {
      const b = parts.brakes;
      const mounts = b?.compat.brakeMounts;
      if (!b || !mounts) return [];
      const out: CompatibilityIssue[] = [];
      for (const cat of ["frame", "fork"] as const) {
        const m = parts[cat]?.compat.brakeMount;
        if (m && !mounts.includes(m)) {
          out.push(issue("brake-mount", "error", ["brakes", cat], `The ${cat} has a ${m} brake mount; ${b.model} calipers are ${mounts.join(" / ")} only.`, `Choose a brake available in a ${m} version.`));
        }
      }
      return out;
    },
  },
  {
    id: "rotor-size",
    label: "Rotor size suits the fork",
    categories: ["fork", "brakes"],
    check: ({ parts }) => {
      const min = parts.fork?.compat.minRotorMm;
      const rotors = parts.brakes?.compat.rotorsMm;
      if (!min || !rotors || rotors[0] >= min) return [];
      return [issue("rotor-size", "error", ["fork", "brakes"], `${parts.fork!.model} needs at least a ${min} mm front rotor; ${parts.brakes!.model} ships with ${rotors[0]} mm.`, `Use a ${min} mm (or larger) front rotor.`)];
    },
  },
  {
    id: "bar-clamp",
    label: "Handlebar and stem clamp",
    categories: ["handlebar", "stem"],
    check: ({ parts }) => {
      const h = parts.handlebar?.compat.barClampMm;
      const s = parts.stem?.compat.barClampMm;
      if (!h || !s || h === s) return [];
      return [issue("bar-clamp", "error", ["handlebar", "stem"], `The handlebar has a ${h} mm clamp; the stem takes ${s} mm.`, `Choose a ${s} mm handlebar or a ${h} mm stem.`)];
    },
  },
  {
    id: "seatpost",
    label: "Seatpost fits the frame",
    categories: ["frame", "seatpost"],
    check: ({ parts }) => {
      const fit = parts.frame?.compat.seatpostFit;
      const post = parts.seatpost;
      const fits = post?.compat.seatpostFits;
      if (!fit || !post || !fits) return [];
      if (fits.includes(fit)) {
        return /^\d/.test(fit) && fits.length > 1
          ? [issue("seatpost", "info", ["frame", "seatpost"], `Order the ${post.model} in ${fit} mm diameter.`)]
          : [];
      }
      const want = /^\d/.test(fit) ? `${fit} mm` : "frame-specific";
      return [issue("seatpost", "error", ["frame", "seatpost"], `The ${parts.frame!.model} needs a ${want} seatpost; ${post.model} is not available in that fit.`, `Choose a ${want} seatpost.`)];
    },
  },
];

export interface RuleResult {
  id: string;
  label: string;
  status: Severity;
  issues: CompatibilityIssue[];
  /** False when the rule had nothing to inspect (missing parts). */
  applicable: boolean;
}

export interface CompatibilityReport {
  issues: CompatibilityIssue[];
  rules: RuleResult[];
  byCategory: Partial<Record<CategoryId, Severity>>;
  errorCount: number;
  warningCount: number;
  ok: boolean;
}

const RANK: Record<Severity, number> = { ok: 0, info: 1, warning: 2, error: 3 };
export const worst = (a: Severity, b: Severity): Severity => (RANK[a] >= RANK[b] ? a : b);

export function resolveParts(selection: PartSelection): Parts {
  const parts: Parts = {};
  for (const [cat, id] of Object.entries(selection) as [CategoryId, string][]) {
    const c = getComponent(id);
    if (c) parts[cat] = c;
  }
  return parts;
}

export function checkCompatibility(discipline: Discipline, selection: PartSelection): CompatibilityReport {
  const parts = resolveParts(selection);
  const ctx = { discipline, parts };
  const rules: RuleResult[] = RULES.map((r) => {
    const issues = r.check(ctx);
    const status = issues.reduce<Severity>((s, i) => worst(s, i.severity), "ok");
    const applicable = r.categories.length === 0 || r.categories.filter((c) => parts[c]).length >= 2;
    return { id: r.id, label: r.label, status, issues, applicable };
  });
  const issues = rules.flatMap((r) => r.issues);
  const byCategory: Partial<Record<CategoryId, Severity>> = {};
  for (const cat of Object.keys(parts) as CategoryId[]) byCategory[cat] = "ok";
  for (const i of issues) for (const c of i.categories) byCategory[c] = worst(byCategory[c] ?? "ok", i.severity);
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  return { issues, rules, byCategory, errorCount, warningCount, ok: errorCount === 0 };
}

/** Would swapping `candidateId` into `category` introduce new errors? */
export function candidateStatus(
  discipline: Discipline,
  selection: PartSelection,
  category: CategoryId,
  candidateId: string,
): { severity: Severity; issues: CompatibilityIssue[] } {
  const report = checkCompatibility(discipline, { ...selection, [category]: candidateId });
  const related = report.issues.filter((i) => i.categories.includes(category));
  const severity = related.reduce<Severity>((s, i) => worst(s, i.severity), "ok");
  return { severity, issues: related };
}
