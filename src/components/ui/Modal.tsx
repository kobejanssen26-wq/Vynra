import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: number;
};

export default function Modal({ open, onClose, title, subtitle, children, width = 480 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ maxWidth: width }}
            className="relative w-full max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl glass-card bg-[color:var(--color-bg-elevated)]/95 p-6"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-fill-hover)] hover:text-[color:var(--color-ink)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
