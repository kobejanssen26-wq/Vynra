"use client";

import { FolderOpen, GitCompare, Globe, Pencil, Save, ShoppingBag, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { CompatibilityReport } from "@/lib/compatibility/engine";
import type { Discipline } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBuilder } from "@/store/builder";

export function Toolbar({ report, onOpenSaved }: { report: CompatibilityReport; onOpenSaved: () => void }) {
  const build = useBuilder((s) => s.build);
  const canUndo = useBuilder((s) => s.history.length > 0);
  const savedCount = useBuilder((s) => s.saved.length);
  const { rename, newBuild, saveBuild, undo } = useBuilder.getState();
  const [editing, setEditing] = useState(false);

  const switchDiscipline = (d: Discipline) => {
    if (d === build.discipline) return;
    if (!window.confirm(`Start a new ${d === "mtb" ? "mountain bike" : "road bike"} build? Unsaved changes to "${build.name}" will be lost.`)) return;
    newBuild(d);
    toast(`Started a new ${d === "mtb" ? "mountain bike" : "road bike"} build`);
  };

  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-2">
          {editing ? (
            <input
              autoFocus
              defaultValue={build.name}
              onBlur={(e) => {
                rename(e.target.value.trim() || build.name);
                setEditing(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-56 rounded-md border border-line-strong px-2 py-1 font-display text-lg font-semibold outline-none focus:border-ink"
              aria-label="Build name"
            />
          ) : (
            <button onClick={() => setEditing(true)} className="group flex min-w-0 items-center gap-2 text-left" title="Rename build">
              <h1 className="truncate font-display text-lg font-semibold tracking-[-0.015em]">{build.name}</h1>
              <Pencil className="size-3.5 text-subtle group-hover:text-ink" />
            </button>
          )}
          <span
            className={cn(
              "ml-1 hidden rounded-sm px-1.5 py-0.5 text-[11.5px] font-medium sm:inline",
              report.errorCount ? "bg-danger-soft text-danger" : report.warningCount ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent-strong",
            )}
          >
            {report.errorCount ? `${report.errorCount} conflict${report.errorCount > 1 ? "s" : ""}` : report.warningCount ? `${report.warningCount} warning${report.warningCount > 1 ? "s" : ""}` : "All compatible"}
          </span>
        </div>

        <div className="flex rounded-md border border-line bg-paper p-0.5 text-[13px]" role="tablist" aria-label="Bike type">
          {(["mtb", "road"] as Discipline[]).map((d) => (
            <button key={d} role="tab" aria-selected={build.discipline === d} onClick={() => switchDiscipline(d)} className={cn("rounded-[5px] px-3 py-1.5 font-medium", build.discipline === d ? "bg-ink text-white" : "text-muted hover:text-ink")}>
              {d === "mtb" ? "Mountain" : "Road"}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} title="Undo last change">
            <Undo2 className="size-4" /> <span className="hidden md:inline">Undo</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenSaved}>
            <FolderOpen className="size-4" /> <span className="hidden md:inline">My builds{savedCount ? ` (${savedCount})` : ""}</span>
          </Button>
          <Link href="/compare?a=current" className={buttonClass("ghost", "sm")}>
            <GitCompare className="size-4" /> <span className="hidden md:inline">Compare</span>
          </Link>
          <Link href="/marketplace" className={buttonClass("ghost", "sm")}>
            <ShoppingBag className="size-4" /> <span className="hidden md:inline">Buy parts</span>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              saveBuild();
              toast("Saved to My builds on this device");
            }}
          >
            <Save className="size-4" /> Save
          </Button>
          <Button
            size="sm"
            onClick={() => {
              saveBuild({ publish: true });
              toast("Saved and marked public. Publishing to the community needs an account — coming with sign-in.", { tone: "info" });
            }}
          >
            <Globe className="size-4" /> Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
