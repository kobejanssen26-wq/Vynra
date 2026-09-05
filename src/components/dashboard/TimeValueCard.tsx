import { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { averageHourlyValue, currentMonthRange, currentWeekRange, filterByRange, workedSessions } from '../../lib/stats';
import { formatCurrency } from '../../lib/calc';

export default function TimeValueCard() {
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);

  const { weekValue, monthValue } = useMemo(() => {
    const worked = workedSessions(sessions);
    const week = currentWeekRange(settings.weekStart);
    const month = currentMonthRange();
    return {
      weekValue: averageHourlyValue(filterByRange(worked, week.from, week.to), jobs),
      monthValue: averageHourlyValue(filterByRange(worked, month.from, month.to), jobs),
    };
  }, [sessions, jobs, settings.weekStart]);

  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <Gauge size={15} className="text-[color:var(--color-teal)]" />
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)]">Jouw gemiddelde waarde van tijd</p>
      </div>
      <p className="mt-2 text-3xl font-bold text-[color:var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
        {formatCurrency(monthValue, settings.currencySymbol)}<span className="text-base font-medium text-[color:var(--color-ink-faint)]"> / gewerkt uur</span>
      </p>
      <div className="mt-3 flex items-center gap-4 text-xs text-[color:var(--color-ink-muted)]">
        <span>Deze week: <strong className="text-[color:var(--color-ink)]">{formatCurrency(weekValue, settings.currencySymbol)}/u</strong></span>
        <span>Deze maand: <strong className="text-[color:var(--color-ink)]">{formatCurrency(monthValue, settings.currencySymbol)}/u</strong></span>
      </div>
    </div>
  );
}
