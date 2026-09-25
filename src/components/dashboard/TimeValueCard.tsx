import { Gauge } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { averageHourlyValue, currentMonthRange, currentWeekRange, earningsByJob, filterByRange, workedSessions } from '../../lib/stats';
import { formatCurrency } from '../../lib/calc';

/** "Wat is mijn tijd waard?" — earnings per worked hour, overall and per job. */
export default function TimeValueCard() {
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);

  const worked = workedSessions(sessions);
  const week = currentWeekRange(settings.weekStart);
  const month = currentMonthRange();
  const monthSessions = filterByRange(worked, month.from, month.to);
  const weekValue = averageHourlyValue(filterByRange(worked, week.from, week.to), jobs);
  const monthValue = averageHourlyValue(monthSessions, jobs);
  const allValue = averageHourlyValue(worked, jobs);
  const headline = monthValue || allValue;
  const byJob = earningsByJob(monthSessions.length ? monthSessions : worked, jobs).slice(0, 3);
  const maxPerHour = Math.max(...byJob.map((b) => b.perHour), 1);

  return (
    <div className="glass-card rounded-3xl p-5">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">
        <Gauge size={14} className="text-[color:var(--color-teal)]" /> Wat is mijn tijd waard?
      </p>
      {headline === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--color-ink-muted)]">Na je eerste sessie zie je hier wat één uur van jouw tijd oplevert.</p>
      ) : (
        <>
          <p className="num mt-3 text-3xl font-bold text-[color:var(--color-ink)]">
            {formatCurrency(headline, settings.currencySymbol)}
            <span className="text-sm font-medium text-[color:var(--color-ink-muted)]"> / gewerkt uur</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--color-ink-muted)] tabular">
            <span>
              Deze week: <strong className="text-[color:var(--color-ink)]">{weekValue ? `${formatCurrency(weekValue, settings.currencySymbol)}/u` : '—'}</strong>
            </span>
            <span>
              Deze maand: <strong className="text-[color:var(--color-ink)]">{monthValue ? `${formatCurrency(monthValue, settings.currencySymbol)}/u` : '—'}</strong>
            </span>
          </div>
          {byJob.length > 1 && (
            <ul className="mt-4 space-y-2">
              {byJob.map(({ job, perHour }) => (
                <li key={job.id} className="flex items-center gap-2.5 text-xs">
                  <span className="w-5 text-center">{job.icon}</span>
                  <span className="w-20 truncate text-[color:var(--color-ink-muted)]">{job.name}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--color-track)]">
                    <span className="block h-full rounded-full" style={{ width: `${(perHour / maxPerHour) * 100}%`, background: job.color }} />
                  </span>
                  <span className="num w-16 text-right font-medium text-[color:var(--color-ink)]">{formatCurrency(perHour, settings.currencySymbol)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
