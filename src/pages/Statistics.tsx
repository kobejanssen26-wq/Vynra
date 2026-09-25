import { useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, BarChart3, Briefcase, Clock, Gauge, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  averageHourlyValue,
  bestEarningDay,
  currentMonthRange,
  currentWeekRange,
  daysInRange,
  earningsByDay,
  earningsByJob,
  filterByRange,
  monthlyEarnings,
  totalEarnings,
  totalMinutes,
  workedSessions,
} from '../lib/stats';
import { WEEKDAY_SHORT_NL, addDays, formatCurrency, formatCurrencyShort, formatDayHeading, formatDurationLong, formatShortDate, fromISODate } from '../lib/calc';
import Segmented from '../components/ui/Segmented';
import EmptyState from '../components/ui/EmptyState';

type Period = 'week' | 'month';

function useChartColors(theme: string) {
  // Recharts writes colours as SVG attributes, which can't resolve CSS variables — read them once per theme.
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    return { neon: v('--color-neon'), teal: v('--color-teal'), info: v('--color-info'), faint: v('--color-ink-faint'), muted: v('--color-ink-muted'), grid: v('--color-border'), track: v('--color-track') };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
}

function ChartCard({ title, subtitle, children, className = '', height = 'h-60' }: { title: string; subtitle?: string; children: ReactNode; className?: string; height?: string }) {
  return (
    <section className={`glass-card rounded-3xl p-5 ${className}`}>
      <p className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-[color:var(--color-ink-faint)]">{subtitle}</p>}
      <div className={`mt-4 ${height}`}>{children}</div>
    </section>
  );
}

type TipProps = { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; format: (v: number, row: Record<string, unknown>) => string; title?: (row: Record<string, unknown>) => string };

function ChartTooltip({ active, payload, label, format, title }: TipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[color:var(--color-ink-muted)]">{title ? title(row) : label}</p>
      <p className="num text-sm font-semibold text-[color:var(--color-ink)]">{format(payload[0].value, row)}</p>
    </div>
  );
}

export default function Statistics() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);
  const sym = settings.currencySymbol;
  const c = useChartColors(settings.theme);
  const [period, setPeriod] = useState<Period>('week');

  const worked = useMemo(() => workedSessions(sessions), [sessions]);
  const range = period === 'week' ? currentWeekRange(settings.weekStart) : currentMonthRange();
  const prevRange = period === 'week'
    ? { from: addDays(range.from, -7), to: addDays(range.from, -1) }
    : (() => {
        const d = fromISODate(range.from);
        const from = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        const to = new Date(d.getFullYear(), d.getMonth(), 0);
        return { from: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`, to: `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-${String(to.getDate()).padStart(2, '0')}` };
      })();

  const inPeriod = filterByRange(worked, range.from, range.to);
  const earned = totalEarnings(inPeriod, jobs);
  const minutes = totalMinutes(inPeriod);
  const prevEarned = totalEarnings(filterByRange(worked, prevRange.from, prevRange.to), jobs);
  const delta = prevEarned > 0 ? ((earned - prevEarned) / prevEarned) * 100 : null;
  const avg = averageHourlyValue(inPeriod, jobs);

  const dayData = earningsByDay(inPeriod, jobs, daysInRange(range.from, range.to)).map((d) => {
    const date = fromISODate(d.date);
    return { ...d, label: period === 'week' ? WEEKDAY_SHORT_NL[date.getDay()] : String(date.getDate()), hours: Math.round((d.minutes / 60) * 100) / 100 };
  });
  const bestInPeriod = bestEarningDay(inPeriod, jobs);
  const jobData = earningsByJob(inPeriod, jobs);
  const maxJob = Math.max(...jobData.map((j) => j.amount), 1);
  const topJob = jobData.slice().sort((a, b) => b.minutes - a.minutes)[0];

  // Last 8 weeks, current week last.
  const thisWeek = currentWeekRange(settings.weekStart).from;
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = addDays(thisWeek, -7 * (7 - i));
    const to = addDays(from, 6);
    return { label: formatShortDate(from), from, amount: totalEarnings(filterByRange(worked, from, to), jobs), current: i === 7 };
  });
  const monthly = monthlyEarnings(worked, jobs, 6);
  const allTimeBest = bestEarningDay(worked, jobs);

  const axis = { stroke: c.faint, fontSize: 11, tickLine: false, axisLine: false } as const;
  const money = (v: number) => formatCurrency(v, sym);

  if (worked.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:hidden" style={{ fontFamily: 'var(--font-display)' }}>
          Statistieken
        </h1>
        <EmptyState icon={<BarChart3 size={22} />} title="Nog geen statistieken" description="Werk je eerste sessie en VYNRA rekent automatisch uit wat je tijd waard is." />
      </div>
    );
  }

  const summary = [
    { icon: Wallet, label: 'verdiend', value: formatCurrency(earned, sym) },
    { icon: Clock, label: 'gewerkt', value: formatDurationLong(minutes) },
    { icon: BarChart3, label: 'werksessies', value: String(inPeriod.length) },
    { icon: Briefcase, label: 'jobs', value: String(jobData.length) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:hidden" style={{ fontFamily: 'var(--font-display)' }}>
            Statistieken
          </h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">
            {formatShortDate(range.from)} – {formatShortDate(range.to)}
          </p>
        </div>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          size="sm"
          className="w-56"
          options={[
            { value: 'week', label: 'Deze week' },
            { value: 'month', label: 'Deze maand' },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <section className="relative overflow-hidden rounded-3xl glass-card p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, var(--color-neon), transparent 70%)' }} />
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">
            <Gauge size={14} className="text-[color:var(--color-neon)]" /> Gemiddeld
          </p>
          <p className="num relative mt-3 text-5xl font-bold text-[color:var(--color-neon)]">
            {formatCurrency(avg, sym)}
            <span className="text-base font-medium text-[color:var(--color-ink-muted)]">/u</span>
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">Zoveel is een uur van jouw tijd {period === 'week' ? 'deze week' : 'deze maand'} waard.</p>
          {delta !== null && (
            <p className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${delta >= 0 ? 'bg-[color:var(--color-neon)]/10 text-[color:var(--color-ink)]' : 'bg-[color:var(--color-danger)]/10 text-[color:var(--color-ink)]'}`}>
              {delta >= 0 ? <TrendingUp size={13} className="text-[color:var(--color-neon)]" /> : <TrendingDown size={13} className="text-[color:var(--color-danger)]" />}
              <span className="num">{delta >= 0 ? '+' : ''}{delta.toFixed(0)}%</span> verdiend t.o.v. {period === 'week' ? 'vorige week' : 'vorige maand'}
            </p>
          )}
        </section>

        <div className="grid grid-cols-2 gap-4">
          {summary.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card rounded-3xl p-5">
              <Icon size={16} className="text-[color:var(--color-ink-muted)]" />
              <p className="num mt-3 text-2xl font-bold text-[color:var(--color-ink)] sm:text-3xl">{value}</p>
              <p className="mt-0.5 text-xs text-[color:var(--color-ink-faint)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ChartCard title="Inkomsten per dag" subtitle={bestInPeriod ? `Beste dag: ${formatDayHeading(bestInPeriod.date)} · ${formatCurrency(bestInPeriod.amount, sym)}` : undefined}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData} margin={{ left: -8, right: 4 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} interval={period === 'month' ? 4 : 0} />
              <YAxis {...axis} width={52} tickFormatter={(v: number) => formatCurrencyShort(v, sym)} />
              <Tooltip cursor={{ fill: c.track }} content={<ChartTooltip format={money} title={(r) => formatDayHeading(String(r.date))} />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={period === 'week' ? 32 : 14}>
                {dayData.map((d) => (
                  <Cell key={d.date} fill={c.neon} fillOpacity={bestInPeriod?.date === d.date ? 1 : 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gewerkte uren per dag" subtitle={`${formatDurationLong(minutes)} in totaal`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData} margin={{ left: -8, right: 4 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} interval={period === 'month' ? 4 : 0} />
              <YAxis {...axis} width={44} allowDecimals={false} tickFormatter={(v: number) => `${v}u`} />
              <Tooltip cursor={{ fill: c.track }} content={<ChartTooltip format={(_v, r) => formatDurationLong(Number(r.minutes))} title={(r) => formatDayHeading(String(r.date))} />} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={period === 'week' ? 32 : 14} fill={c.teal} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inkomsten per job" subtitle="Wat elke job oplevert, en per uur" height="h-auto min-h-60">
          {jobData.length === 0 ? (
            <p className="flex h-60 items-center justify-center text-sm text-[color:var(--color-ink-faint)]">Nog geen sessies in deze periode.</p>
          ) : (
            <ul className="space-y-4">
              {jobData.map((j) => (
                <li key={j.job.id} className="group">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-[color:var(--color-ink)]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: j.job.color }} />
                      <span className="truncate">{j.job.icon} {j.job.name}</span>
                    </span>
                    <span className="num shrink-0 font-semibold text-[color:var(--color-ink)]">{formatCurrency(j.amount, sym)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--color-track)]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(j.amount / maxJob) * 100}%`, background: j.job.color }} />
                  </div>
                  <p className="num mt-1 text-[11px] text-[color:var(--color-ink-faint)]">
                    {formatDurationLong(j.minutes)} · {j.count} sessies · {formatCurrency(j.perHour, sym)}/u
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Week-over-week" subtitle="Verdiend per week, laatste 8 weken">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ left: -8, right: 4 }}>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} interval={1} />
              <YAxis {...axis} width={52} tickFormatter={(v: number) => formatCurrencyShort(v, sym)} />
              <Tooltip cursor={{ fill: c.track }} content={<ChartTooltip format={money} title={(r) => `Week van ${formatShortDate(String(r.from))}${r.current ? ' (nu)' : ''}`} />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {weeks.map((w) => (
                  <Cell key={w.from} fill={w.current ? c.neon : c.track} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Maandelijkse inkomsten" subtitle="Laatste 6 maanden" className="md:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ left: -8, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="vynra-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.neon} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={c.neon} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={c.grid} vertical={false} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} width={60} tickFormatter={(v: number) => formatCurrencyShort(v, sym)} />
              <Tooltip cursor={{ stroke: c.faint, strokeDasharray: '3 3' }} content={<ChartTooltip format={(v, r) => `${money(v)} · ${formatDurationLong(Number(r.minutes))}`} />} />
              <Area type="monotone" dataKey="amount" stroke={c.neon} strokeWidth={2} fill="url(#vynra-area)" activeDot={{ r: 5, strokeWidth: 2, stroke: c.neon, fill: '#05070a' }} dot={{ r: 3, fill: c.neon, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {topJob && (
          <div className="glass-card flex items-center gap-4 rounded-3xl p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `${topJob.job.color}26` }}>
              {topJob.job.icon}
            </div>
            <div>
              <p className="text-xs text-[color:var(--color-ink-faint)]">Meest gewerkte job</p>
              <p className="font-semibold text-[color:var(--color-ink)]">{topJob.job.name}</p>
              <p className="num text-xs text-[color:var(--color-ink-muted)]">{formatDurationLong(topJob.minutes)}</p>
            </div>
          </div>
        )}
        {allTimeBest && (
          <div className="glass-card flex items-center gap-4 rounded-3xl p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-neon)]/10 text-[color:var(--color-neon)]">
              <Award size={22} />
            </div>
            <div>
              <p className="text-xs text-[color:var(--color-ink-faint)]">Beste verdienende dag ooit</p>
              <p className="font-semibold text-[color:var(--color-ink)]">{formatDayHeading(allTimeBest.date)}</p>
              <p className="num text-xs text-[color:var(--color-ink-muted)]">{formatCurrency(allTimeBest.amount, sym)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
