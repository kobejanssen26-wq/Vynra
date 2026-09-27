"use client";

import { Trash2 } from "lucide-react";
import { BikeVisual } from "@/components/bike/BikeVisual";
import { Button } from "@/components/ui/button";
import { DataNote } from "@/components/ui/note";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { formatEur, formatKg, timeAgo } from "@/lib/format";
import { computeStats } from "@/lib/stats";
import { useBuilder } from "@/store/builder";

export function SavedBuildsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const saved = useBuilder((s) => s.saved);
  const currentId = useBuilder((s) => s.build.id);
  const { loadBuild, deleteSaved, newBuild } = useBuilder.getState();

  return (
    <Sheet open={open} onClose={onClose} title="My builds" width={480}>
      <div className="space-y-3 p-6">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => { newBuild("mtb"); onClose(); }}>New MTB build</Button>
          <Button variant="outline" onClick={() => { newBuild("road"); onClose(); }}>New road build</Button>
        </div>
        {saved.length === 0 && <p className="rounded-lg border border-dashed border-line-strong px-5 py-10 text-center text-[14px] text-muted">No saved builds yet. Use “Save” in the toolbar.</p>}
        {saved.map((b) => {
          const s = computeStats(b.discipline, b.parts);
          return (
            <div key={b.id} className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="bg-paper px-6 pt-3"><BikeVisual discipline={b.discipline} selection={b.parts} /></div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.name} {b.visibility === "public" && <span className="ml-1 rounded-sm bg-accent-soft px-1 py-0.5 text-[10.5px] text-accent-strong">Public</span>}</p>
                  <p className="tabular text-[12.5px] text-muted">{formatEur(s.priceEur)} · {formatKg(s.weightKg)} · saved {timeAgo(b.updatedAt)}</p>
                </div>
                <Button size="sm" variant={b.id === currentId ? "outline" : "primary"} onClick={() => { loadBuild(b); onClose(); toast(`Loaded “${b.name}”`); }}>
                  {b.id === currentId ? "Open" : "Load"}
                </Button>
                <button onClick={() => deleteSaved(b.id)} className="rounded-md p-2 text-muted hover:bg-danger-soft hover:text-danger" aria-label={`Delete ${b.name}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
        <DataNote className="pt-2">Builds are stored in this browser until accounts are available.</DataNote>
      </div>
    </Sheet>
  );
}
