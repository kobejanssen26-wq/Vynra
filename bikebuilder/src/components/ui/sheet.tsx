"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Right-hand slide-over panel. */
export function Sheet({ open, onClose, title, children, className, width = 520 }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; className?: string; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-ink/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className={cn("absolute inset-y-0 right-0 flex w-full flex-col bg-paper shadow-2xl", className)}
            style={{ maxWidth: width }}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="min-w-0 text-sm font-medium text-muted">{title}</div>
              <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-ink/5 hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
