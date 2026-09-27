"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { DataNote } from "@/components/ui/note";
import { categoryMeta } from "@/lib/categories";
import { getComponent } from "@/lib/catalog";
import { STYLE_LABEL } from "@/lib/recommend/profiles";
import type { CategoryId } from "@/lib/types";
import { useBuilder, useStoreHydrated } from "@/store/builder";
import { AssistantDock } from "./AssistantDock";
import { CompatibilityPanel } from "./CompatibilityPanel";
import { ComponentList } from "./ComponentList";
import { ComponentSheet, type SheetState } from "./ComponentSheet";
import { SavedBuildsSheet } from "./SavedBuildsSheet";
import { StatsPanel } from "./StatsPanel";
import { Toolbar } from "./Toolbar";
import { UpgradeSuggestions } from "./UpgradeSuggestions";
import { useDerived } from "./useDerived";
import { VisualPanel } from "./VisualPanel";

export function BuilderPage() {
  const hydrated = useStoreHydrated();
  const { build, stats, compat, style, profile } = useDerived();
  const { setPart, applySwaps, undo } = useBuilder.getState();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [hover, setHover] = useState<CategoryId | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);

  const open = (c: CategoryId) => {
    const id = build.parts[c];
    setSheet(id ? { mode: "detail", category: c, componentId: id } : { mode: "picker", category: c });
  };

  const select = (c: CategoryId, id: string) => {
    const prev = getComponent(build.parts[c]);
    setPart(c, id);
    const next = getComponent(id)!;
    toast(`${categoryMeta(c).label}: ${next.brand} ${next.model}`, { action: prev ? { label: "Undo", run: undo } : undefined });
  };

  const focus = sheet?.category ?? hover;

  return (
    <div className={hydrated ? "" : "opacity-0"} style={{ transition: "opacity .2s" }}>
      <Toolbar report={compat} onOpenSaved={() => setSavedOpen(true)} />

      <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_480px]">
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card lg:sticky lg:top-[80px]">
            <VisualPanel discipline={build.discipline} parts={build.parts} status={compat.byCategory} focus={focus} onSelect={open} />
            <StatsPanel stats={stats} />
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em]">Components</h2>
                <p className="text-[12.5px] text-muted">{Object.keys(build.parts).length} of 14 selected</p>
              </div>
              {stats.missing.length > 0 && <span className="text-[12.5px] text-warn">Missing: {stats.missing.map((m) => categoryMeta(m).label).join(", ")}</span>}
            </div>
            <ComponentList parts={build.parts} status={compat.byCategory} focus={focus} onOpen={open} onReplace={(c) => setSheet({ mode: "picker", category: c })} onHover={setHover} />
          </div>
        </div>

        <div className="mt-14 space-y-14">
          <UpgradeSuggestions
            discipline={build.discipline}
            parts={build.parts}
            profile={profile}
            styleLabel={STYLE_LABEL[style]}
            onApply={(u) => {
              applySwaps(u.swaps);
              toast(`Upgraded to ${u.headline}`, { action: { label: "Undo", run: undo } });
            }}
          />
          <CompatibilityPanel report={compat} />
          <DataNote>
            Catalog prices are indicative retail prices and weights are approximate manufacturer figures (sample data). Scores are a transparent heuristic built from component ratings and weight, not lab measurements.
          </DataNote>
        </div>
      </div>

      <ComponentSheet state={sheet} onState={setSheet} discipline={build.discipline} parts={build.parts} profile={profile} onSelect={select} />
      <SavedBuildsSheet open={savedOpen} onClose={() => setSavedOpen(false)} />
      <AssistantDock />
    </div>
  );
}
