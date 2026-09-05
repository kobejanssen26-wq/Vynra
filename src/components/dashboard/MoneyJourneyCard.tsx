import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { averageHourlyValue } from '../../lib/stats';
import { workedSessions } from '../../lib/stats';
import { effectiveRate, formatDurationLong } from '../../lib/calc';
import ProgressBar from '../ui/ProgressBar';

export default function MoneyJourneyCard() {
  const goals = useStore((s) => s.goals);
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);

  useTicker(!!active && !active.isPaused, 5000);

  const goal = goals[0];
  if (!goal) return null;

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const fallbackRate = averageHourlyValue(workedSessions(sessions), jobs) || jobs[0]?.baseRate || 0;
  const activeJob = active ? jobs.find((j) => j.id === active.jobId) : undefined;
  const rate = active ? effectiveRate(activeJob, active.rateId) : fallbackRate;
  const remainingHours = rate > 0 ? remaining / rate : 0;
  const remainingMinutes = remainingHours * 60;
  const progress = (goal.currentAmount / goal.targetAmount) * 100;

  return (
    <Link to="/spaardoelen" className="block glass-card rounded-3xl p-5 hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <Compass size={15} className="text-[color:var(--color-neon)]" />
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)]">Money Journey</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-lg">{goal.icon}</span>
        <span className="text-sm font-semibold text-[color:var(--color-ink)]">{goal.name}</span>
      </div>
      <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
        Nog <strong className="text-[color:var(--color-ink)]">{formatDurationLong(remainingMinutes)}</strong> tot je {goal.name.toLowerCase()}.
      </p>
      <div className="mt-3">
        <ProgressBar value={progress} height={6} />
      </div>
    </Link>
  );
}
