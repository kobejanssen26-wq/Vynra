"use client";

import { ChevronRight, Plus } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { getComponent } from "@/lib/catalog";
import { formatEur, formatGrams } from "@/lib/format";
import type { CategoryId, PartSelection, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ComponentList({
  parts,
  status,
  focus,
  onOpen,
  onReplace,
  onHover,
}: {
  parts: PartSelection;
  status: Partial<Record<CategoryId, Severity>>;
  focus: CategoryId | null;
  onOpen: (c: CategoryId) => void;
  onReplace: (c: CategoryId) => void;
  onHover: (c: CategoryId | null) => void;
}) {
  return (
    <ul className="divide-y divide-line" onMouseLeave={() => onHover(null)}>
      {CATEGORIES.map((cat) => {
        const c = getComponent(parts[cat.id]);
        const st = status[cat.id] ?? "ok";
        return (
          <li
            key={cat.id}
            onMouseEnter={() => onHover(cat.id)}
            className={cn("group relative flex items-center gap-4 px-5 py-3.5 transition-colors", focus === cat.id ? "bg-paper-2" : "hover:bg-paper/80")}
          >
            <span className={cn("absolute inset-y-0 left-0 w-0.5", st === "error" ? "bg-danger" : st === "warning" ? "bg-warn" : "bg-transparent")} />
            <button className="min-w-0 flex-1 text-left" onClick={() => (c ? onOpen(cat.id) : onReplace(cat.id))}>
              <div className="flex items-center gap-2">
                <span className="eyebrow text-muted">{cat.label}</span>
                {c && <StatusBadge status={st} />}
              </div>
              {c ? (
                <>
                  <p className="mt-1 truncate text-[14.5px] font-medium text-ink">{c.model}</p>
                  <p className="tabular mt-0.5 text-[12.5px] text-muted">
                    {c.brand} · {formatGrams(c.weightG)}{c.includedWith ? " · included with frame" : ""}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[14px] text-subtle">Not selected</p>
              )}
            </button>
            {c ? (
              <div className="flex shrink-0 items-center gap-1">
                <span className="tabular hidden w-16 text-right font-display text-[15px] font-semibold text-ink sm:block">
                  {c.includedWith ? "—" : formatEur(c.priceEur)}
                </span>
                <Button variant="outline" size="sm" onClick={() => onReplace(cat.id)} className="ml-2">
                  Replace
                </Button>
                <button onClick={() => onOpen(cat.id)} className="rounded-md p-1.5 text-subtle hover:bg-ink/5 hover:text-ink" aria-label={`${cat.label} details`}>
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onReplace(cat.id)}>
                <Plus className="size-3.5" /> Choose
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
