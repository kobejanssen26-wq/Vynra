import { useMemo, useState } from 'react';
import { History as HistoryIcon, Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Session } from '../types';
import {
  formatCurrency,
  formatDayHeading,
  formatDurationLong,
  sessionEarnings,
  sessionMinutes,
  todayISO,
} from '../lib/calc';
import { currentMonthRange, currentWeekRange } from '../lib/stats';
import FilterSelect from '../components/ui/FilterSelect';
import EmptyState from '../components/ui/EmptyState';
import SessionModal from '../components/SessionModal';

type DateFilter = 'all' | 'week' | 'month';
type KindFilter = 'all' | 'worked' | 'manual' | 'planned';

const KIND_LABEL: Record<Session['kind'], string> = {
  worked: 'Gewerkt',
  manual: 'Handmatig',
  planned: 'Gepland',
};

const KIND_COLOR: Record<Session['kind'], string> = {
  worked: 'var(--color-neon)',
  manual: 'var(--color-warn)',
  planned: 'var(--color-info)',
};

export default function HistoryPage() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);

  const [jobFilter, setJobFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [editSession, setEditSession] = useState<Session | null>(null);

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
    }
    return list.sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? 1 : -1));
  }, [sessions, jobFilter, kindFilter, dateFilter, settings.weekStart]);

  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of filtered) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const today = todayISO();
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  function dateLabel(date: string) {
    if (date === today) return 'Vandaag';
    if (date === yesterday) return 'Gisteren';
    return formatDayHeading(date);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="lg:hidden text-2xl font-bold text-[color:var(--color-ink)]">Geschiedenis</h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">Al je sessies, overzichtelijk per dag.</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <FilterSelect value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="all">Alle jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.icon} {j.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
          <option value="all">Alle datums</option>
          <option value="week">Deze week</option>
          <option value="month">Deze maand</option>
        </FilterSelect>
        <FilterSelect value={kindFilter} onChange={(e) => setKindFilter(e.target.value as KindFilter)}>
          <option value="all">Gewerkt & gepland</option>
          <option value="worked">Gewerkt</option>
          <option value="manual">Handmatig toegevoegd</option>
          <option value="planned">Gepland</option>
        </FilterSelect>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={22} />}
          title="Nog geen werkuren geregistreerd."
          description="Zodra je een sessie start en stopt, verschijnt die hier terug."
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([date, list]) => {
            const sorted = list.slice().sort((a, b) => b.startTime.localeCompare(a.startTime));
            return (
              <div key={date}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-ink-faint)] mb-2.5">
                  {dateLabel(date)}
                </h3>
                <div className="space-y-2">
                  {sorted.map((s) => {
                    const job = jobs.find((j) => j.id === s.jobId);
                    const amount = sessionEarnings(s, job);
                    const minutes = sessionMinutes(s);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setEditSession(s)}
                        className="w-full flex items-center gap-3.5 rounded-2xl glass-card px-4 py-3.5 text-left hover:bg-white/[0.04] transition-colors group"
                      >
                        <span className="text-xl shrink-0">{job?.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[color:var(--color-ink)] truncate">{job?.name}</p>
                            <span
                              className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ background: `${KIND_COLOR[s.kind]}1a`, color: KIND_COLOR[s.kind] }}
                            >
                              {KIND_LABEL[s.kind]}
                            </span>
                          </div>
                          <p className="text-xs text-[color:var(--color-ink-faint)] mt-0.5">
                            {s.startTime} – {s.endTime} · {formatDurationLong(minutes)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold ${s.kind === 'planned' ? 'text-[color:var(--color-info)]' : 'text-[color:var(--color-neon)]'}`}>
                            {formatCurrency(amount, settings.currencySymbol)}
                          </p>
                        </div>
                        <Pencil size={13} className="text-[color:var(--color-ink-faint)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SessionModal open={!!editSession} onClose={() => setEditSession(null)} editSession={editSession} />
    </div>
  );
}
