"use client";

import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { categoryMeta } from "@/lib/categories";
import { formatEurDelta, formatGramDelta } from "@/lib/format";
import { suggestUpgrades, type UpgradeSuggestion } from "@/lib/recommend/engine";
import type { PreferenceProfile } from "@/lib/recommend/profiles";
import type { Discipline, PartSelection } from "@/lib/types";

export function UpgradeSuggestions({
  discipline,
  parts,
  profile,
  styleLabel,
  onApply,
}: {
  discipline: Discipline;
  parts: PartSelection;
  profile: PreferenceProfile;
  styleLabel: string;
  onApply: (s: UpgradeSuggestion) => void;
}) {
  const ups = useMemo(() => suggestUpgrades(discipline, parts, profile, 4), [discipline, parts, profile]);
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Upgrade suggestions</h2>
          <p className="mt-1 text-[14px] text-muted">Best value per euro for {styleLabel}. Every option keeps the build compatible.</p>
        </div>
      </div>
      {ups.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line-strong px-5 py-8 text-center text-[14px] text-muted">
          Nothing in the catalog is a clear upgrade for this build right now.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ups.map((u) => {
            const s = u.swaps[0];
            return (
              <article key={s.toId} className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-card">
                <p className="eyebrow text-muted">{categoryMeta(s.category).label}</p>
                <h3 className="mt-2 text-[15.5px] font-semibold leading-snug text-ink">{u.headline}</h3>
                <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[12.5px] font-medium text-accent-strong">
                  <TrendingUp className="size-3.5" /> {u.benefit}
                </p>
                <dl className="tabular mt-4 grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <dt className="text-muted">Additional cost</dt>
                    <dd className="mt-0.5 font-display text-lg font-semibold">{formatEurDelta(u.deltaPriceEur)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Weight</dt>
                    <dd className={`mt-0.5 font-display text-lg font-semibold ${u.deltaWeightG < 0 ? "text-accent-strong" : ""}`}>{formatGramDelta(u.deltaWeightG)}</dd>
                  </div>
                </dl>
                <p className="mt-4 flex-1 text-[13px] leading-relaxed text-muted">{s.reason}</p>
                <Button className="mt-5 w-full" onClick={() => onApply(u)}>
                  Apply Upgrade <ArrowUpRight className="size-4" />
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
