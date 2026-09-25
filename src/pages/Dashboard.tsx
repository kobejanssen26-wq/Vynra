import { Link } from 'react-router-dom';
import { CalendarPlus, PenLine } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { addDays, formatCurrency, formatDayHeading, formatDurationLong, relativeDayLabel, todayISO } from '../lib/calc';
import { currentWeekRange, filterByRange, plannedSessions, totalEarnings, totalMinutes, workedSessions } from '../lib/stats';
import LiveEarningsCard from '../components/dashboard/LiveEarningsCard';
import NextMilestoneCard from '../components/dashboard/NextMilestoneCard';
import TimeValueCard from '../components/dashboard/TimeValueCard';
import MoneyJourneyCard from '../components/dashboard/MoneyJourneyCard';
import ForgottenStartBanner from '../components/dashboard/ForgottenStartBanner';
import JobsStrip from '../components/dashboard/JobsStrip';
import SessionRow from '../components/SessionRow';
import Button from '../components/ui/Button';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Goedenacht';
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

export default function Dashboard() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);
  const { openSession, openForgot } = useUI();

  const today = todayISO();
  const worked = workedSessions(sessions);
  const todays = worked.filter((s) => s.date === today);
  const week = currentWeekRange(settings.weekStart);
  const weekWorked = filterByRange(worked, week.from, week.to);
  const upcoming = plannedSessions(sessions)
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const expected7 = totalEarnings(upcoming.filter((s) => s.date <= addDays(today, 6)), jobs);
  const recent = worked.slice().sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)).slice(0, 4);
  const sym = settings.currencySymbol;
  const name = settings.profileName.split(' ')[0];

  const stats = [
    { label: 'Vandaag verdiend', value: formatCurrency(totalEarnings(todays, jobs), sym), sub: formatDurationLong(totalMinutes(todays)), tone: 'earned' },
    { label: 'Deze week verdiend', value: formatCurrency(totalEarnings(weekWorked, jobs), sym), sub: formatDurationLong(totalMinutes(weekWorked)), tone: 'earned' },
    { label: 'Verwacht · 7 dagen', value: formatCurrency(expected7, sym), sub: `${upcoming.filter((s) => s.date <= addDays(today, 6)).length} gepland`, tone: 'expected' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--color-ink-muted)]">{formatDayHeading(today)}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
            {greeting()}
            {name ? `, ${name}` : ''}.
          </h1>
        </div>
        <Button variant="ghost" size="sm" icon={<PenLine size={14} />} onClick={() => openSession({ defaultDate: today })} className="hidden sm:inline-flex">
          Handmatig een sessie toevoegen
        </Button>
      </div>

      <ForgottenStartBanner onFix={openForgot} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <LiveEarningsCard onForgotStart={() => openForgot()} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <NextMilestoneCard />
          <MoneyJourneyCard />
          <TimeValueCard />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`glass-card rounded-3xl p-4 sm:p-5 ${i === 2 ? 'col-span-2 sm:col-span-1' : ''}`}>
            <p className="flex items-center gap-1.5 text-xs text-[color:var(--color-ink-muted)]">
              <span className={`h-1.5 w-1.5 rounded-full ${s.tone === 'earned' ? 'bg-[color:var(--color-neon)]' : 'bg-[color:var(--color-info)]'}`} />
              {s.label}
            </p>
            <p className={`num mt-2 text-2xl font-bold sm:text-3xl ${s.tone === 'earned' ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-info)]'}`}>{s.value}</p>
            <p className="mt-0.5 text-xs text-[color:var(--color-ink-faint)] tabular">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card min-w-0 rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">Recente sessies</h3>
            <Link to="/geschiedenis" className="text-xs font-medium text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-neon)]">
              Alles bekijken
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-[color:var(--color-ink-faint)]">Nog geen werkuren geregistreerd.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((s) => (
                <div key={s.id}>
                  <p className="mb-1 ml-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-faint)]">{relativeDayLabel(s.date)}</p>
                  <SessionRow dense session={s} job={jobs.find((j) => j.id === s.jobId)} symbol={sym} onClick={() => openSession({ editSession: s })} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card min-w-0 rounded-3xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">Gepland</h3>
            <button
              onClick={() => openSession({ defaultDate: addDays(today, 1), defaultKind: 'planned' })}
              className="flex items-center gap-1 text-xs font-medium text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-neon)]"
            >
              <CalendarPlus size={13} /> Werkdag plannen
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-[color:var(--color-ink-faint)]">Geen geplande werkdagen. Plan je volgende dienst en zie wat je kunt verwachten.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.slice(0, 4).map((s) => (
                <div key={s.id}>
                  <p className="mb-1 ml-1 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-faint)]">{relativeDayLabel(s.date)}</p>
                  <SessionRow dense session={s} job={jobs.find((j) => j.id === s.jobId)} symbol={sym} onClick={() => openSession({ editSession: s })} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <JobsStrip />

      <Button variant="secondary" fullWidth icon={<PenLine size={15} />} onClick={() => openSession({ defaultDate: today })} className="sm:hidden">
        Handmatig een sessie toevoegen
      </Button>
    </div>
  );
}
