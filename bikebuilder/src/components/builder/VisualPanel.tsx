"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BikeVisual } from "@/components/bike/BikeVisual";
import type { CategoryId, Discipline, PartSelection, Severity } from "@/lib/types";

export function VisualPanel({
  discipline,
  parts,
  status,
  focus,
  onSelect,
}: {
  discipline: Discipline;
  parts: PartSelection;
  status: Partial<Record<CategoryId, Severity>>;
  focus: CategoryId | null;
  onSelect: (c: CategoryId) => void;
}) {
  const key = JSON.stringify(parts);
  const prev = useRef(key);
  const [updating, setUpdating] = useState(false);

  // Brief "updating" state whenever a part changes, so the change registers visually.
  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    setUpdating(true);
    const t = setTimeout(() => setUpdating(false), 550);
    return () => clearTimeout(t);
  }, [key]);

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#ffffff_0%,#f3f3ee_70%)] px-4 pb-2 pt-12 sm:px-8">
      <div className="absolute left-5 top-4 flex items-center gap-2 text-[12px] text-muted">
        <span className="inline-flex size-1.5 rounded-full bg-accent" />
        Live preview · schematic
      </div>
      <AnimatePresence>
        {updating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-5 top-3.5 inline-flex items-center gap-1.5 rounded-sm bg-ink px-2 py-1 text-[11.5px] font-medium text-white"
          >
            <Loader2 className="size-3 animate-spin" /> Updating visualization
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div animate={{ opacity: updating ? 0.55 : 1, filter: updating ? "blur(1.5px)" : "blur(0px)" }} transition={{ duration: 0.25 }}>
        <BikeVisual discipline={discipline} selection={parts} hotspots onSelect={onSelect} highlight={focus} status={status} />
      </motion.div>
      {updating && <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="animate-shimmer h-full w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent" /></div>}
    </div>
  );
}
