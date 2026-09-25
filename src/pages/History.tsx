import { useMemo, useState } from 'react';
import { History as HistoryIcon, Plus, SearchX } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import type { Session } from '../types';
import { formatCurrency, formatDurationLong, relativeDayLabel, todayISO } from '../lib/calc';
import { currentMonthRange, currentWeekRange, plannedSessions, totalEarnings, totalMinutes, workedSessions } from '../lib/stats';
import FilterSelect from '../components/ui/FilterSelect';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import SessionRow from '../components/SessionRow';
import { TextInput } from '../components/ui/Field';

type DateFilter = 'all' | 'week' | 'month' | 'date';
type KindFilter = 'all' | Session['kind'];

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Alles' },
  { value: 'worked', label: 'Gewerkt' },
  { value: 'manual', label: 'Handmatig toegevoegd' },
  { value: 'planned', label: 'Gepland' },
];

export default function HistoryPage() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);
  const openSession = useUI((s) => s.openSession);
  const sym = settings.currencySymbol;

  const [jobFilter, setJobFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [pickedDate, setPickedDate] = useState(todayISO());
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');

  const filtered = useMemo(() => {
    let list = sessions.slice();
    if (jobFilter !== 'all') list = list.filter((s) => s.jobId === jobFilter);
    if (kindFilter !== 'all') list = list.filter((s) => s.kind === kindFilter);
    if (dateFilter === 'week') {
      const { from, to } = currentWeekRange(settings.weekStart);
      list = list.filter((s) => s.date >= from && s.date <= to);
    } else if (dateFilter === 'month') {
      const { from, to } = currentMonthRange();
      list = list.filter((s) => s.date >= from && s.date <= to);
    } else if (dateFilter === 'date') {
      list = list.filter((s) => s.date === pickedDate);
    }
    return list.sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  }, [sessions, jobFilter, kindFilter, dateFilter, pickedDate, settings.weekStart]);

  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return Array.from(map.entries());
  }, [filtered]);

  const worked = workedSessions(filtered);
  const planned = plannedSessions(filtered);
  const filtersActive = jobFilter !== 'all' || dateFilter !== 'all' || kindFilter !== 'all';

  function resetFilters() {
    setJobFilter('all');
    setDateFilter('all');
    setKindFilter('all');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:hidden" style={{ fontFamily: 'var(--font-display)' }}>
            Geschiedenis
          </h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">Al je sessies, per dag. Tik op een sessie om die aan te passen.</p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => openSession({ defaultDate: todayISO() })}>
          Handmatig een sessie toevoegen
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} aria-label="Job">
            <option value="all">Alle jobs</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.icon} {j.name}
                {j.archived ? ' (verwijderd)' : ''}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)} aria-label="Periode">
            <option value="all">Alle datums</option>
            <option value="week">Deze week</option>
            <option value="month">Deze maand</option>
            <option value="date">Datum…</option>
          </FilterSelect>
          {dateFilter === 'date' && <TextInput type="date" value={pickedDate} onChange={(e) => setPickedDate(e.target.value)} className="!w-auto !py-2" aria-label="Datum" />}
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar">
          {KIND_FILTERS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKindFilter(k.value)}
              aria-pressed={kindFilter === k.value}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                kindFilter === k.value
                  ? 'border-[color:var(--color-neon)]/50 bg-[color:var(--color-neon)]/10 text-[color:var(--color-ink)]'
                  : 'border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] px-4 py-3 text-sm">
          <span className="text-[color:var(--color-ink-muted)]">
            <span className="num font-semibold text-[color:var(--color-ink)]">{worked.length}</span> sessies
          </span>
          <span className="text-[color:var(--color-ink-muted)]">
            <span className="num font-semibold text-[color:var(--color-ink)]">{formatDurationLong(totalMinutes(worked))}</span> gewerkt
          </span>
          <span className="text-[color:var(--color-ink-muted)]">
            <span className="num font-semibold text-[color:var(--color-neon)]">{formatCurrency(totalEarnings(worked, jobs), sym)}</span> verdiend
          </span>
          {planned.length > 0 && (
            <span className="text-[color:var(--color-ink-muted)]">
              <span className="num font-semibold text-[color:var(--color-info)]">{formatCurrency(totalEarnings(planned, jobs), sym)}</span> verwacht
            </span>
          )}
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={22} />}
          title="Nog geen werkuren geregistreerd."
          description="Zodra je een sessie start en stopt, verschijnt die hier."
          action={
            <Button variant="secondary" icon={<Plus size={15} />} onClick={() => openSession({ defaultDate: todayISO() })}>
              Handmatig een sessie toevoegen
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="Geen sessies gevonden"
          description="Er zijn geen sessies die bij deze filters passen."
          action={
            filtersActive ? (
              <Button variant="secondary" onClick={resetFilters}>
                Filters wissen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-7">
          {groups.map(([date, list]) => {
            const dayWorked = workedSessions(list);
            return (
              <section key={date}>
                <div className="mb-2.5 flex items-baseline justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-ink-faint)]">{relativeDayLabel(date)}</h3>
                  {dayWorked.length > 0 && (
                    <span className="num text-xs text-[color:var(--color-ink-muted)]">
                      {formatDurationLong(totalMinutes(dayWorked))} · {formatCurrency(totalEarnings(dayWorked, jobs), sym)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {list.map((s) => (
                    <SessionRow key={s.id} session={s} job={jobs.find((j) => j.id === s.jobId)} symbol={sym} onClick={() => openSession({ editSession: s })} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
