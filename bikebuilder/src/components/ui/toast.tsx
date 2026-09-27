"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { create } from "zustand";

interface Toast {
  id: number;
  text: string;
  tone: "success" | "info";
  action?: { label: string; run: () => void };
}

const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (text: string, opts: Partial<Omit<Toast, "id" | "text">> = {}) =>
  useToasts.getState().push({ text, tone: opts.tone ?? "success", action: opts.action });

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto flex items-center gap-3 rounded-lg bg-ink px-4 py-3 text-[13.5px] text-white shadow-lift"
          >
            {t.tone === "success" ? <Check className="size-4 text-accent-bright" /> : <Info className="size-4 text-white/60" />}
            <span className="flex-1">{t.text}</span>
            {t.action && (
              <button
                className="text-[13px] font-medium text-accent-bright hover:underline"
                onClick={() => {
                  t.action!.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
