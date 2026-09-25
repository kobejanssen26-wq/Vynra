import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { effectiveRate, formatCurrency, formatCurrencyShort } from '../../lib/calc';
import { activeWorkedSeconds } from '../../lib/stats';

/** Optional in-session nudge: the next round amount and a ring that fills toward it. */
export default function NextMilestoneCard() {
  const jobs = useStore((s) => s.jobs);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const now = useTicker(!!active && !active.isPaused);

  if (!settings.showMilestone || !active) return null;

  const step = settings.milestoneStep > 0 ? settings.milestoneStep : 10;
  const rate = effectiveRate(jobs.find((j) => j.id === active.jobId), active.rateId);
  const earned = (activeWorkedSeconds(active, now) / 3600) * rate;
  const next = Math.floor(earned / step + 1e-9) * step + step;
  const progress = Math.min(1, Math.max(0, (earned - (next - step)) / step));
  const remaining = Math.max(0, next - earned);
  const remainingMin = rate > 0 ? Math.ceil((remaining / rate) * 60) : 0;

  const r = 27;
  const c = 2 * Math.PI * r;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group relative glass-card rounded-3xl p-5 flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r={r} stroke="var(--color-track)" strokeWidth="5" fill="none" />
          <circle
            cx="32"
            cy="32"
            r={r}
            stroke="var(--color-neon)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)', filter: 'drop-shadow(0 0 6px rgba(57,255,176,0.45))' }}
          />
        </svg>
        <span className="num absolute inset-0 flex items-center justify-center text-xs font-semibold text-[color:var(--color-ink)]">
          {formatCurrencyShort(next, settings.currencySymbol)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">Next milestone</p>
        <p className="mt-1 text-sm text-[color:var(--color-ink)]">
          Nog <strong className="num">{formatCurrency(remaining, settings.currencySymbol)}</strong> om {formatCurrencyShort(next, settings.currencySymbol)} te verdienen.
        </p>
        <p className="mt-0.5 text-xs text-[color:var(--color-ink-faint)]">{active.isPaused ? 'Gepauzeerd' : `± ${remainingMin} min werk`}</p>
      </div>
      <button
        onClick={() => updateSettings({ showMilestone: false })}
        aria-label="Next milestone verbergen"
        title="Verbergen (weer aan te zetten in Instellingen)"
        className="absolute right-3 top-3 rounded-lg p-1 text-[color:var(--color-ink-faint)] opacity-0 transition-opacity hover:text-[color:var(--color-ink)] group-hover:opacity-100 focus:opacity-100"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}
