"use client";

import { Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { BikeVisual } from "@/components/bike/BikeVisual";
import { Container } from "@/components/ui/container";
import { DataNote } from "@/components/ui/note";
import { CATEGORIES } from "@/lib/categories";
import { getComponent } from "@/lib/catalog";
import { analyzeComparison, type ComparableBuild } from "@/lib/compare";
import { COMMUNITY_BUILDS, getUser } from "@/lib/community/data";
import { formatEur, formatKg } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import type { BuildStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBuilder, useStoreHydrated } from "@/store/builder";

interface Option extends ComparableBuild {
  group: string;
  label: string;
}

type Better = "higher" | "lower" | null;
interface Row {
  label: string;
  a: string;
  b: string;
  va?: number;
  vb?: number;
  better?: Better;
}

export function CompareView() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const current = useBuilder((s) => s.build);
  const saved = useBuilder((s) => s.saved);

  const options: Option[] = useMemo(
    () => [
      { ...current, id: "current", group: "Your builds", label: `${current.name} (in builder)` },
      ...saved.map((b) => ({ ...b, group: "Your builds", label: b.name })),
      ...COMMUNITY_BUILDS.map((b) => ({ ...b, group: "Community", label: `${b.name} — ${getUser(b.authorId)?.name}` })),
    ],
    [current, saved],
  );

  const aId = params.get("a") ?? "mountain-beast";
  const bId = params.get("b") ?? "featherweight-xc";
  const A = options.find((o) => o.id === aId) ?? options[1];
  const B = options.find((o) => o.id === bId) ?? options[2];

  const set = (key: "a" | "b", id: string) => {
    const q = new URLSearchParams(params.toString());
    q.set(key, id);
    router.replace(`/compare?${q.toString()}`, { scroll: false });
  };

  const sa = computeStats(A.discipline, A.parts);
  const sb = computeStats(B.discipline, B.parts);
  const analysis = useMemo(() => analyzeComparison(A, B), [A, B]);

  const travel = (s: BuildStats) => (s.frontTravelMm ? `${s.frontTravelMm} / ${s.rearTravelMm || "—"} mm` : "Rigid");
  const rows: Row[] = [
    { label: "Weight", a: formatKg(sa.weightKg), b: formatKg(sb.weightKg), va: sa.weightKg, vb: sb.weightKg, better: "lower" },
    { label: "Price", a: formatEur(sa.priceEur), b: formatEur(sb.priceEur), va: sa.priceEur, vb: sb.priceEur, better: "lower" },
    { label: "Performance", a: `${sa.performance}/100`, b: `${sb.performance}/100`, va: sa.performance, vb: sb.performance, better: "higher" },
    { label: "Climbing", a: `${sa.climbing}/10`, b: `${sb.climbing}/10`, va: sa.climbing, vb: sb.climbing, better: "higher" },
    { label: "Downhill", a: `${sa.descending}/10`, b: `${sb.descending}/10`, va: sa.descending, vb: sb.descending, better: "higher" },
    { label: "Comfort", a: `${sa.comfort}%`, b: `${sb.comfort}%`, va: sa.comfort, vb: sb.comfort, better: "higher" },
    { label: "Durability", a: `${sa.durability}%`, b: `${sb.durability}%`, va: sa.durability, vb: sb.durability, better: "higher" },
    { label: "Maintenance", a: sa.maintenance, b: sb.maintenance },
    { label: "Terrain", a: sa.terrain, b: sb.terrain },
    { label: "Suspension travel (F / R)", a: travel(sa), b: travel(sb) },
    { label: "Wheel size", a: sa.wheelSize ? (sa.wheelSize === "700c" ? "700c" : `${sa.wheelSize}"`) : "—", b: sb.wheelSize ? (sb.wheelSize === "700c" ? "700c" : `${sb.wheelSize}"`) : "—" },
    { label: "Drivetrain", a: sa.drivetrain ?? "—", b: sb.drivetrain ?? "—" },
    { label: "Brakes", a: sa.brakes ?? "—", b: sb.brakes ?? "—" },
  ];

  const win = (r: Row, side: "a" | "b") => {
    if (!r.better || r.va === undefined || r.vb === undefined || r.va === r.vb) return false;
    const aWins = r.better === "higher" ? r.va > r.vb : r.va < r.vb;
    return side === "a" ? aWins : !aWins;
  };

  const groups = Array.from(new Set(options.map((o) => o.group)));

  return (
    <div className={hydrated ? "" : "opacity-0"}>
      <section className="border-b border-line bg-white">
        <Container className="py-12">
          <p className="eyebrow text-accent">Compare bikes</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Two builds, side by side.</h1>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {([["a", A], ["b", B]] as const).map(([key, o]) => (
              <div key={key} className="overflow-hidden rounded-xl border border-line bg-paper">
                <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
                  <span className="flex size-7 items-center justify-center rounded-md bg-ink font-display text-[13px] font-semibold text-white">{key.toUpperCase()}</span>
                  <label className="sr-only" htmlFor={`bike-${key}`}>Bike {key.toUpperCase()}</label>
                  <select id={`bike-${key}`} value={o.id} onChange={(e) => set(key, e.target.value)} className="min-w-0 flex-1 cursor-pointer rounded-md border border-line bg-white px-2 py-1.5 text-[14px] font-medium outline-none focus:border-ink/40">
                    {groups.map((g) => (
                      <optgroup key={g} label={g}>
                        {options.filter((x) => x.group === g).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="px-6 pt-4"><BikeVisual discipline={o.discipline} selection={o.parts} /></div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead>
              <tr className="border-b border-line bg-paper text-left">
                <th className="w-[28%] px-5 py-3 text-[12px] font-medium uppercase tracking-wider text-muted" />
                <th className="px-5 py-3 font-display text-[15px] font-semibold">Bike A · {A.name}</th>
                <th className="px-5 py-3 font-display text-[15px] font-semibold">Bike B · {B.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="px-5 py-3 text-muted">{r.label}</td>
                  {(["a", "b"] as const).map((side) => (
                    <td key={side} className={cn("tabular px-5 py-3", win(r, side) ? "font-semibold text-accent-strong" : "text-ink")}>
                      {r[side]}
                      {win(r, side) && <span className="ml-1.5 text-[11px] font-medium">▲</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-paper">
                <td colSpan={3} className="px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-muted">Components</td>
              </tr>
              {CATEGORIES.map((cat) => {
                const ca = getComponent(A.parts[cat.id]);
                const cb = getComponent(B.parts[cat.id]);
                const same = ca?.id === cb?.id;
                return (
                  <tr key={cat.id}>
                    <td className="px-5 py-3 text-muted">{cat.label}</td>
                    {[ca, cb].map((c, i) => (
                      <td key={i} className={cn("px-5 py-3", same && "text-muted")}>
                        {c ? <>{c.brand} {c.model} <span className="tabular text-[12.5px] text-subtle">· {c.includedWith ? "incl." : formatEur(c.priceEur)}</span></> : "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section className="mt-10 rounded-xl bg-ink p-8 text-white">
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-[-0.02em]"><Sparkles className="size-5 text-accent-bright" /> AI Analysis</h2>
          <ul className="mt-5 space-y-3 text-[15px] leading-relaxed text-white/80">
            {analysis.map((l) => <li key={l} className="flex gap-3"><span className="mt-2.5 size-1 shrink-0 rounded-full bg-accent-bright" />{l}</li>)}
          </ul>
          <p className="mt-6 text-[12px] text-white/40">Generated from the two builds&apos; catalog specifications and computed scores only.</p>
        </section>
        <DataNote className="mt-6">Scores are BikeBuilder&apos;s heuristic index from component ratings and weight. Prices and weights are indicative sample catalog data.</DataNote>
      </Container>
    </div>
  );
}
