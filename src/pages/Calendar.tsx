import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import type { Session } from '../types';
import {
  MONTH_LABELS_NL,
  WEEKDAY_SHORT_NL,
  addDays,
  formatCurrency,
  formatCurrencyShort,
  formatDayHeading,
  formatDurationLong,
  sessionEarnings,
  toISODate,
  todayISO,
} from '../lib/calc';
import { filterByRange, monthRange, plannedSessions, totalEarnings, totalMinutes, workedSessions } from '../lib/stats';
import Button from '../components/ui/Button';
import SessionRow from '../components/SessionRow';
import { KIND_META } from '../lib/kinds';

function buildMonthGrid(year: number, month: number, weekStart: 'monday' | 'sunday') {
  const first = new Date(year, month, 1);
  const startOffset = weekStart === 'monday' ? (first.getDay() + 6) % 7 : first.getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((startOffset + lastDay) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => new Date(year, month, 1 - startOffset + i));
}

const STATUS_ORDER: Session['kind'][] = ['worked', 'manual', 'planned'];

export default function CalendarPage() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);
  const openSession = useUI((s) => s.openSession);
  const sym = settings.currencySymbol;

  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const touchX = useRef<number | null>(null);

  const weekdayLabels = settings.weekStart === 'monday' ? [...WEEKDAY_SHORT_NL.slice(1), WEEKDAY_SHORT_NL[0]] : WEEKDAY_SHORT_NL;
  const days = useMemo(() => buildMonthGrid(cursor.year, cursor.month, settings.weekStart), [cursor, settings.weekStart]);

  const byDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) map.set(s.date, [...(map.get(s.date) ?? []), s]);
    return map;
  }, [sessions]);

  const range = monthRange(cursor.year, cursor.month);
  const monthSessions = filterByRange(sessions, range.from, range.to);
  const monthWorked = workedSessions(monthSessions);
  const monthPlanned = plannedSessions(monthSessions);

  const daySessions = (byDate.get(selected) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dayWorked = workedSessions(daySessions);
  const dayPlanned = plannedSessions(daySessions);
  const isFutureDay = selected > today;

  function goMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function addForSelected() {
    openSession({ defaultDate: selected, defaultKind: isFutureDay ? 'planned' : 'done' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:hidden" style={{ fontFamily: 'var(--font-display)' }}>
            Kalender
          </h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">Gewerkte en geplande dagen in één overzicht.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<CalendarPlus size={14} />} onClick={() => openSession({ defaultDate: selected > today ? selected : addDays(today, 1), defaultKind: 'planned' })}>
            Werkdag plannen
          </Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => openSession({ defaultDate: selected <= today ? selected : today })}>
            Sessie toevoegen
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div
          className="glass-card rounded-3xl p-3 sm:p-6"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 60) goMonth(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="mb-4 flex items-center justify-between px-1 sm:mb-5">
            <h2 className="text-lg font-semibold capitalize text-[color:var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {MONTH_LABELS_NL[cursor.month]} {cursor.year}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => goMonth(-1)} aria-label="Vorige maand" className="flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-fill-hover)]">
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  setCursor({ year: d.getFullYear(), month: d.getMonth() });
                  setSelected(today);
                }}
                className="h-10 rounded-xl px-3 text-xs font-medium text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-fill-hover)]"
              >
                Vandaag
              </button>
              <button onClick={() => goMonth(1)} aria-label="Volgende maand" className="flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-fill-hover)]">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {weekdayLabels.map((d) => (
              <div key={d} className="py-1 text-center text-[11px] font-medium text-[color:var(--color-ink-faint)]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {days.map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === cursor.month;
              const list = byDate.get(iso) ?? [];
              const kinds = STATUS_ORDER.filter((k) => list.some((s) => s.kind === k));
              const earned = totalEarnings(workedSessions(list), jobs);
              const expected = totalEarnings(plannedSessions(list), jobs);
              const isSelected = iso === selected;
              const isToday = iso === today;

              return (
                <button
                  key={iso}
                  onClick={() => {
                    setSelected(iso);
                    if (!inMonth) setCursor({ year: d.getFullYear(), month: d.getMonth() });
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${formatDayHeading(iso)}${list.length ? `, ${list.length} sessies` : ''}`}
                  className={`relative flex min-h-[52px] flex-col items-center justify-start gap-1 rounded-xl pt-2 text-sm transition-colors sm:aspect-[1/0.9] sm:min-h-0 sm:rounded-2xl sm:pt-2.5 ${
                    inMonth ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-ink-faint)] opacity-50'
                  } ${!isSelected ? 'hover:bg-[color:var(--color-fill-hover)]' : ''}`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="cal-selected"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      className="absolute inset-0 rounded-xl bg-[color:var(--color-neon)]/[0.12] ring-1 ring-[color:var(--color-neon)]/50 sm:rounded-2xl"
                    />
                  )}
                  <span
                    className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular ${
                      isToday ? 'bg-[color:var(--color-neon)] font-bold text-[#04140d]' : ''
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <span className="relative flex h-1.5 gap-0.5">
                    {kinds.length === 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-track)]" />
                    ) : (
                      kinds.map((k) => <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_META[k].color }} />)
                    )}
                  </span>
                  {(earned > 0 || expected > 0) && (
                    <span className={`num relative hidden text-[11px] font-medium sm:block ${earned > 0 ? 'text-[color:var(--color-ink-muted)]' : 'text-[color:var(--color-info)]'}`}>
                      {formatCurrencyShort(earned > 0 ? earned : expected, sym)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-[color:var(--color-ink-muted)]">
            {[
              { c: 'var(--color-neon)', l: 'Gewerkt' },
              { c: 'var(--color-info)', l: 'Gepland' },
              { c: 'var(--color-warn)', l: 'Handmatig aangepast' },
              { c: 'var(--color-track)', l: 'Geen gegevens' },
            ].map((x) => (
              <span key={x.l} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: x.c }} /> {x.l}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[color:var(--color-border)] px-1 pt-4">
            <div>
              <p className="text-[11px] text-[color:var(--color-ink-faint)]">Verdiend</p>
              <p className="num text-base font-semibold text-[color:var(--color-ink)]">{formatCurrency(totalEarnings(monthWorked, jobs), sym)}</p>
            </div>
            <div>
              <p className="text-[11px] text-[color:var(--color-ink-faint)]">Gewerkt</p>
              <p className="num text-base font-semibold text-[color:var(--color-ink)]">{formatDurationLong(totalMinutes(monthWorked))}</p>
            </div>
            <div>
              <p className="text-[11px] text-[color:var(--color-ink-faint)]">Verwacht</p>
              <p className="num text-base font-semibold text-[color:var(--color-info)]">{formatCurrency(totalEarnings(monthPlanned, jobs), sym)}</p>
            </div>
          </div>
        </div>

        <motion.div key={selected} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} className="glass-card flex flex-col rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[color:var(--color-ink)]">{formatDayHeading(selected)}</h3>
              {selected === today && <p className="text-xs text-[color:var(--color-neon)]">Vandaag</p>}
            </div>
            <button
              onClick={addForSelected}
              aria-label={isFutureDay ? 'Werkdag plannen' : 'Sessie toevoegen'}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--color-neon)] hover:bg-[color:var(--color-fill-hover)]"
            >
              <Plus size={18} />
            </button>
          </div>

          {daySessions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-[color:var(--color-ink-muted)]">Geen gegevens voor deze dag.</p>
              <Button variant="secondary" size="sm" className="mt-4" icon={isFutureDay ? <CalendarPlus size={14} /> : <Plus size={14} />} onClick={addForSelected}>
                {isFutureDay ? 'Werkdag plannen' : 'Sessie toevoegen'}
              </Button>
            </div>
          ) : (
            <div className="flex-1 space-y-2">
              {daySessions.map((s) => (
                <SessionRow key={s.id} dense session={s} job={jobs.find((j) => j.id === s.jobId)} symbol={sym} onClick={() => openSession({ editSession: s })} />
              ))}
            </div>
          )}

          {daySessions.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-[color:var(--color-border)] pt-4">
              {dayWorked.length > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-[color:var(--color-ink-muted)]">
                    Totaal <span className="num text-[color:var(--color-ink)]">{formatDurationLong(totalMinutes(dayWorked))}</span>
                  </span>
                  <span className="num text-xl font-bold text-[color:var(--color-neon)]">
                    {formatCurrency(dayWorked.reduce((sum, s) => sum + sessionEarnings(s, jobs.find((j) => j.id === s.jobId)), 0), sym)}
                  </span>
                </div>
              )}
              {dayPlanned.length > 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-[color:var(--color-ink-muted)]">
                    Verwacht <span className="num">{formatDurationLong(totalMinutes(dayPlanned))}</span>
                  </span>
                  <span className="num text-base font-semibold text-[color:var(--color-info)]">{formatCurrency(totalEarnings(dayPlanned, jobs), sym)}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
