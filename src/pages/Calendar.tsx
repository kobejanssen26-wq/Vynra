import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Pencil } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Session } from '../types';
import {
  MONTH_LABELS_NL,
  WEEKDAY_SHORT_NL,
  formatCurrency,
  formatDayHeading,
  formatDurationLong,
  sessionEarnings,
  sessionMinutes,
  toISODate,
  todayISO,
} from '../lib/calc';
import Button from '../components/ui/Button';
import SessionModal from '../components/SessionModal';

function buildMonthGrid(year: number, month: number, weekStart: 'monday' | 'sunday') {
  const first = new Date(year, month, 1);
  const startOffset = weekStart === 'monday' ? (first.getDay() === 0 ? 6 : first.getDay() - 1) : first.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

const STATUS_COLOR: Record<Session['kind'], string> = {
  worked: 'var(--color-neon)',
  planned: 'var(--color-info)',
  manual: 'var(--color-warn)',
};

export default function CalendarPage() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);

  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);

  const weekdayLabels =
    settings.weekStart === 'monday' ? WEEKDAY_SHORT_NL.slice(1).concat(WEEKDAY_SHORT_NL[0]) : WEEKDAY_SHORT_NL;

  const days = useMemo(() => buildMonthGrid(cursor.year, cursor.month, settings.weekStart), [cursor, settings.weekStart]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return map;
  }, [sessions]);

  const selectedSessions = (sessionsByDate.get(selected) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
  const worked = selectedSessions.filter((s) => s.kind !== 'planned');
  const planned = selectedSessions.filter((s) => s.kind === 'planned');
  const workedTotal = worked.reduce((sum, s) => sum + sessionEarnings(s, jobs.find((j) => j.id === s.jobId)), 0);
  const workedMinutes = worked.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const plannedTotal = planned.reduce((sum, s) => sum + sessionEarnings(s, jobs.find((j) => j.id === s.jobId)), 0);

  function goMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function openAdd() {
    setEditSession(null);
    setModalOpen(true);
  }

  function openEdit(session: Session) {
    setEditSession(session);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lg:hidden text-2xl font-bold text-[color:var(--color-ink)]">Kalender</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">Verleden en toekomstige werkdagen in één overzicht.</p>
        </div>
        <div className="hidden sm:block">
          <Button icon={<Plus size={16} />} onClick={openAdd} size="sm">
            Sessie toevoegen
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        <div className="glass-card rounded-3xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
              {MONTH_LABELS_NL[cursor.month]} {cursor.year}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => goMonth(-1)} className="rounded-lg p-1.5 text-[color:var(--color-ink-muted)] hover:bg-white/[0.06]">
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  setCursor({ year: d.getFullYear(), month: d.getMonth() });
                  setSelected(today);
                }}
                className="px-2 py-1 rounded-lg text-xs font-medium text-[color:var(--color-ink-muted)] hover:bg-white/[0.06]"
              >
                Vandaag
              </button>
              <button onClick={() => goMonth(1)} className="rounded-lg p-1.5 text-[color:var(--color-ink-muted)] hover:bg-white/[0.06]">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {weekdayLabels.map((d) => (
              <div key={d} className="text-center text-[11px] font-medium text-[color:var(--color-ink-faint)] py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {days.map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === cursor.month;
              const daySessions = sessionsByDate.get(iso) ?? [];
              const kinds = Array.from(new Set(daySessions.map((s) => s.kind)));
              const isSelected = iso === selected;
              const isToday = iso === today;

              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`relative aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 text-sm transition-colors ${
                    isSelected
                      ? 'bg-[color:var(--color-neon)]/15 text-[color:var(--color-ink)] ring-1 ring-[color:var(--color-neon)]/50'
                      : inMonth
                      ? 'text-[color:var(--color-ink)] hover:bg-white/[0.05]'
                      : 'text-[color:var(--color-ink-faint)] hover:bg-white/[0.03]'
                  }`}
                >
                  <span className={isToday ? 'font-bold text-[color:var(--color-neon)]' : ''}>{d.getDate()}</span>
                  <span className="flex gap-0.5 h-1.5">
                    {kinds.length === 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
                    ) : (
                      kinds.slice(0, 3).map((k) => (
                        <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[k] }} />
                      ))
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[color:var(--color-ink-muted)]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--color-neon)]" /> Gewerkt</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--color-info)]" /> Gepland</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--color-warn)]" /> Handmatig aangepast</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/20" /> Geen gegevens</span>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">{formatDayHeading(selected)}</h3>
            <button onClick={openAdd} className="text-[color:var(--color-neon)] hover:bg-white/[0.06] rounded-lg p-1.5">
              <Plus size={16} />
            </button>
          </div>

          {selectedSessions.length === 0 ? (
            <p className="text-sm text-[color:var(--color-ink-faint)] py-8 text-center">Geen gegevens voor deze dag.</p>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[360px] pr-1">
              {selectedSessions.map((s) => {
                const job = jobs.find((j) => j.id === s.jobId);
                const amount = sessionEarnings(s, job);
                const minutes = sessionMinutes(s);
                return (
                  <button
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] px-3.5 py-3 text-left hover:bg-white/[0.05] transition-colors group"
                  >
                    <span className="text-lg shrink-0">{job?.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[color:var(--color-ink)] truncate">{job?.name}</p>
                      <p className="text-xs text-[color:var(--color-ink-faint)]">
                        {s.startTime} – {s.endTime} · {formatDurationLong(minutes)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${s.kind === 'planned' ? 'text-[color:var(--color-info)]' : 'text-[color:var(--color-neon)]'}`}>
                        {formatCurrency(amount, settings.currencySymbol)}
                      </p>
                      <p className="text-[10px] text-[color:var(--color-ink-faint)]">{s.kind === 'planned' ? 'verwacht' : 'verdiend'}</p>
                    </div>
                    <Pencil size={13} className="text-[color:var(--color-ink-faint)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {selectedSessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[color:var(--color-border)] space-y-1.5">
              {worked.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--color-ink-muted)]">Totaal verdiend ({formatDurationLong(workedMinutes)})</span>
                  <span className="font-semibold text-[color:var(--color-neon)]">{formatCurrency(workedTotal, settings.currencySymbol)}</span>
                </div>
              )}
              {planned.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--color-ink-muted)]">Totaal verwacht</span>
                  <span className="font-semibold text-[color:var(--color-info)]">{formatCurrency(plannedTotal, settings.currencySymbol)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SessionModal open={modalOpen} onClose={() => setModalOpen(false)} editSession={editSession} defaultDate={selected} />
    </div>
  );
}
