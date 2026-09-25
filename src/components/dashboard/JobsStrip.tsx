import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { formatCurrency } from '../../lib/calc';
import { visibleJobs } from '../../lib/stats';

export default function JobsStrip() {
  const jobs = visibleJobs(useStore((s) => s.jobs));
  const symbol = useStore((s) => s.settings.currencySymbol);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">Mijn jobs</h3>
        <Link to="/jobs" className="text-xs font-medium text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-neon)]">
          Beheren
        </Link>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 no-scrollbar">
        {jobs.map((job) => (
          <Link
            key={job.id}
            to="/jobs"
            className="flex min-w-[152px] shrink-0 flex-col gap-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] px-4 py-3.5 transition-colors hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-fill-hover)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ background: `${job.color}24` }}>
              {job.icon}
            </span>
            <span className="truncate text-sm font-medium text-[color:var(--color-ink)]">{job.name}</span>
            <span className="num text-xs text-[color:var(--color-ink-muted)]">{formatCurrency(job.baseRate, symbol)} / uur</span>
          </Link>
        ))}
        <Link
          to="/jobs?nieuw=1"
          className="flex min-w-[152px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[color:var(--color-border-strong)] px-4 py-3.5 text-[color:var(--color-ink-muted)] transition-colors hover:border-[color:var(--color-neon)]/40 hover:text-[color:var(--color-ink)]"
        >
          <Plus size={18} />
          <span className="text-xs font-medium">Nieuwe job</span>
        </Link>
      </div>
    </section>
  );
}
