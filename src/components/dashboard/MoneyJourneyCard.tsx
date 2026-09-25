import { Link } from 'react-router-dom';
import { Compass, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { effectiveRate, formatCurrency, formatDurationLong, lowerFirst } from '../../lib/calc';
import { activeWorkedSeconds, averageHourlyValue, goalJourney, journeyGoal, workedSessions } from '../../lib/stats';
import ProgressBar from '../ui/ProgressBar';

export default function MoneyJourneyCard() {
  const goals = useStore((s) => s.goals);
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const now = useTicker(!!active && !active.isPaused);

  const goal = journeyGoal(goals);
  if (!goal) {
    return (
      <Link to="/spaardoelen" className="group block rounded-3xl border border-dashed border-[color:var(--color-border-strong)] p-5 transition-colors hover:border-[color:var(--color-neon)]/40">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">
          <Compass size={14} className="text-[color:var(--color-neon)]" /> Money Journey
        </p>
        <p className="mt-2 text-sm font-medium text-[color:var(--color-ink)]">Waar werk je naartoe?</p>
        <p className="mt-0.5 text-xs text-[color:var(--color-ink-muted)]">Kies een doel en zie het omgerekend in werkuren.</p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--color-neon)]">
          <Plus size={13} /> Nieuw doel
        </span>
      </Link>
    );
  }

  const activeRate = active ? effectiveRate(jobs.find((j) => j.id === active.jobId), active.rateId) : 0;
  const rate = activeRate || averageHourlyValue(workedSessions(sessions), jobs) || jobs[0]?.baseRate || settings.defaultRate;
  const liveEarned = active ? (activeWorkedSeconds(active, now) / 3600) * activeRate : 0;
  const j = goalJourney(goal, rate, liveEarned);

  return (
    <Link to="/spaardoelen" className="block glass-card rounded-3xl p-5 transition-colors hover:border-[color:var(--color-border-strong)]">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">
          <Compass size={14} className="text-[color:var(--color-neon)]" /> Money Journey
        </p>
        {active && j.share > 0 && !active.isPaused && (
          <span className="rounded-full bg-[color:var(--color-neon)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-neon)]">live</span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="text-xl">{goal.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">{goal.name}</p>
          <p className="num text-xs text-[color:var(--color-ink-muted)]">
            {formatDurationLong(j.totalHours * 60)} → {formatCurrency(goal.targetAmount, settings.currencySymbol)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[color:var(--color-ink-muted)]">
        {j.remaining <= 0 ? (
          <strong className="text-[color:var(--color-neon)]">Doel bereikt.</strong>
        ) : (
          <>
            Nog <strong className="num text-[color:var(--color-ink)]">{formatDurationLong(j.remainingHours * 60)}</strong> tot je {lowerFirst(goal.name)}.
          </>
        )}
      </p>
      <div className="mt-3">
        <ProgressBar value={j.progress} height={6} animateOnMount={false} />
      </div>
      <p className="mt-1.5 flex justify-between text-[11px] text-[color:var(--color-ink-faint)] tabular">
        <span>{formatCurrency(j.saved, settings.currencySymbol)}</span>
        <span>{j.progress.toFixed(0)}%</span>
      </p>
    </Link>
  );
}
