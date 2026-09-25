import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { formatCurrency, formatHMS } from '../../lib/calc';
import { activeEarnings, activeWorkedSeconds } from '../../lib/stats';

/** Compact live session widget shown in the sidebar while a session runs. */
export default function LiveBadge() {
  const active = useStore((s) => s.active);
  const jobs = useStore((s) => s.jobs);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const now = useTicker(!!active && !active.isPaused);
  if (!active) return null;
  const job = jobs.find((j) => j.id === active.jobId);

  return (
    <Link
      to="/"
      className="block rounded-2xl border border-[color:var(--color-neon)]/25 bg-[color:var(--color-neon)]/[0.06] px-3.5 py-3 transition-colors hover:bg-[color:var(--color-neon)]/[0.1]"
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-muted)]">
        <span className={`h-1.5 w-1.5 rounded-full ${active.isPaused ? 'bg-[color:var(--color-warn)]' : 'bg-[color:var(--color-neon)] animate-[pulse-soft_1.6s_ease-in-out_infinite]'}`} />
        {active.isPaused ? 'Gepauzeerd' : 'Sessie loopt'}
      </p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm text-[color:var(--color-ink)]">
          {job?.icon} {job?.name}
        </span>
        <span className="num text-sm font-semibold text-[color:var(--color-neon)]">{formatCurrency(activeEarnings(active, jobs, now), symbol)}</span>
      </div>
      <p className="num mt-0.5 text-xs text-[color:var(--color-ink-muted)]">{formatHMS(activeWorkedSeconds(active, now))}</p>
    </Link>
  );
}
