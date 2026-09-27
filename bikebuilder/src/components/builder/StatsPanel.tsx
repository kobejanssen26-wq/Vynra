"use client";

import { Mountain, Wrench } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Meter } from "@/components/ui/meter";
import { formatEur, formatGrams } from "@/lib/format";
import type { BuildStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatsPanel({ stats, className }: { stats: BuildStats; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 border-t border-line sm:grid-cols-4", className)}>
      <Stat label="Current price">
        <AnimatedNumber value={stats.priceEur} format={(n) => formatEur(Math.round(n))} />
      </Stat>
      <Stat label="Bike weight" hint={`incl. ≈${formatGrams(stats.hardwareAllowanceG)} small parts`}>
        <AnimatedNumber value={stats.weightKg} format={(n) => `${n.toFixed(1)} kg`} />
      </Stat>
      <Stat label="Performance score">
        <AnimatedNumber value={stats.performance} format={(n) => `${Math.round(n)}`} />
        <span className="text-base text-muted">/100</span>
        <Meter value={stats.performance} tone="accent" className="mt-2.5" />
      </Stat>
      <Stat label="Terrain">
        <span className="inline-flex items-center gap-2">
          <Mountain className="size-4 text-accent" /> {stats.terrain}
        </span>
        <p className="mt-1 text-[12px] font-normal text-muted">
          {stats.frontTravelMm ? `${stats.frontTravelMm} / ${stats.rearTravelMm || "—"} mm travel` : stats.wheelSize ? `${stats.wheelSize === "700c" ? "700c" : `${stats.wheelSize}"`} · rigid` : "—"}
        </p>
      </Stat>
      <Stat label="Comfort">
        <AnimatedNumber value={stats.comfort} format={(n) => `${Math.round(n)}%`} />
        <Meter value={stats.comfort} className="mt-2.5" />
      </Stat>
      <Stat label="Durability">
        <AnimatedNumber value={stats.durability} format={(n) => `${Math.round(n)}%`} />
        <Meter value={stats.durability} className="mt-2.5" />
      </Stat>
      <Stat label="Climbing / Descending">
        <span className="tabular">{stats.climbing.toFixed(1)}</span>
        <span className="text-base text-muted"> / </span>
        <span className="tabular">{stats.descending.toFixed(1)}</span>
        <div className="mt-2.5 flex gap-1">
          <Meter value={stats.climbing} max={10} className="flex-1" />
          <Meter value={stats.descending} max={10} className="flex-1" />
        </div>
      </Stat>
      <Stat label="Maintenance">
        <span className="inline-flex items-center gap-2">
          <Wrench className="size-4 text-muted" />
          <span className={cn(stats.maintenance === "Easy" ? "text-accent-strong" : stats.maintenance === "Moderate" ? "text-warn" : "text-danger")}>{stats.maintenance}</span>
        </span>
      </Stat>
    </div>
  );
}

function Stat({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-r border-line px-5 py-4 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-last-child(-n+4)]:border-b-0">
      <p className="text-[11.5px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-1.5 font-display text-[18px] font-semibold sm:text-[22px] tracking-[-0.02em] text-ink">{children}</div>
      {hint && <p className="mt-0.5 text-[11.5px] text-subtle">{hint}</p>}
    </div>
  );
}
