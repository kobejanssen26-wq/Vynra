import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../lib/calc';

export default function JobsStrip() {
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">Mijn jobs</h3>
        <Link to="/jobs" className="text-xs font-medium text-[color:var(--color-neon)] hover:underline">
          Alles bekijken
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to="/jobs"
            className="flex min-w-[150px] shrink-0 flex-col gap-2 rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.05] hover:border-[color:var(--color-border-strong)] transition-colors"
          >
            <span className="text-xl">{job.icon}</span>
            <span className="text-sm font-medium text-[color:var(--color-ink)] truncate">{job.name}</span>
            <span className="text-xs text-[color:var(--color-neon)]">{formatCurrency(job.baseRate, settings.currencySymbol)} / uur</span>
          </Link>
        ))}
        <Link
          to="/jobs"
          className="flex min-w-[150px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[color:var(--color-border-strong)] px-4 py-3.5 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-neon)]/40 transition-colors"
        >
          <Plus size={18} />
          <span className="text-xs font-medium">Nieuwe job</span>
        </Link>
      </div>
    </div>
  );
}
