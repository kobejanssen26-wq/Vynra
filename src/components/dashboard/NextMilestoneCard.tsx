import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { effectiveRate, formatCurrency, moneyFromSeconds } from '../../lib/calc';
import { Target } from 'lucide-react';

const STEP = 10;

export default function NextMilestoneCard() {
  const jobs = useStore((s) => s.jobs);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);

  useTicker(!!active && !active.isPaused);

  if (!settings.showMilestone || !active) return null;

  const job = jobs.find((j) => j.id === active.jobId);
  const rate = effectiveRate(job, active.rateId);
  const elapsedSeconds = active.accumulatedMs / 1000 + (active.isPaused ? 0 : (Date.now() - active.segmentStart) / 1000);
  const earned = moneyFromSeconds(elapsedSeconds, rate);

  const next = Math.floor(earned / STEP) * STEP + STEP;
  const prev = next - STEP;
  const progress = Math.min(1, Math.max(0, (earned - prev) / STEP));
  const remaining = Math.max(0, next - earned);
  const remainingSeconds = rate > 0 ? (remaining / rate) * 3600 : 0;
  const remH = Math.floor(remainingSeconds / 3600);
  const remM = Math.max(1, Math.round((remainingSeconds % 3600) / 60));

  const r = 26;
  const c = 2 * Math.PI * r;

  return (
    <div className="glass-card rounded-3xl p-5 flex items-center gap-4">
      <div className="relative shrink-0 h-16 w-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
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
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[color:var(--color-neon)]">
          <Target size={18} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)]">Next milestone</p>
        <p className="mt-0.5 text-sm text-[color:var(--color-ink)]">
          Nog {formatCurrency(remaining, settings.currencySymbol)} om {formatCurrency(next, settings.currencySymbol)} te verdienen.
        </p>
        <p className="mt-0.5 text-xs text-[color:var(--color-ink-faint)]">
          ~{remH > 0 ? `${remH}u ` : ''}{remM}m te gaan
        </p>
      </div>
    </div>
  );
}
