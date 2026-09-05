import { useMemo, type ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Briefcase, Clock, TrendingUp, Wallet } from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  currentWeekRange,
  earningsByDay,
  earningsByJob,
  monthlyEarnings,
  totalEarnings,
  totalMinutes,
  weekDays,
  weekOverWeek,
  workedSessions,
  bestEarningDay,
} from '../lib/stats';
import { WEEKDAY_SHORT_NL, formatCurrency, formatDayHeading, formatDurationLong } from '../lib/calc';

const CHART_COLORS = ['#39FFB0', '#2FD9E8', '#B18CFF', '#FFC15E', '#FF7E8A', '#6EA8FF'];

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="glass-card rounded-3xl p-5">
      <p className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</p>
      {subtitle && <p className="text-xs text-[color:var(--color-ink-faint)] mt-0.5 mb-2">{subtitle}</p>}
      <div className="h-56 mt-2">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: '#0e131b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  fontSize: 12,
  color: '#eef4f2',
};

function moneyFormatter(symbol: string, label: string) {
  return (v: unknown) => [formatCurrency(Number(v) || 0, symbol), label] as [string, string];
}

export default function Statistics() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);

  const worked = useMemo(() => workedSessions(sessions), [sessions]);

  const week = currentWeekRange(settings.weekStart);
  const weekSessions = worked.filter((s) => s.date >= week.from && s.date <= week.to);
  const weekTotal = totalEarnings(weekSessions, jobs);
  const weekMinutes = totalMinutes(weekSessions);
  const weekJobsUsed = new Set(weekSessions.map((s) => s.jobId)).size;
  const avgHourly = weekMinutes > 0 ? weekTotal / (weekMinutes / 60) : 0;

  const days = weekDays(week.from);
  const dayData = earningsByDay(worked, jobs, days).map((d, i) => ({
    day: WEEKDAY_SHORT_NL[(new Date(d.date + 'T00:00:00').getDay())],
    amount: d.amount,
    hours: Math.round((d.minutes / 60) * 100) / 100,
    idx: i,
  }));

  const jobData = earningsByJob(worked, jobs);
  const wow = weekOverWeek(worked, jobs, settings.weekStart);
  const monthly = monthlyEarnings(worked, jobs, 6);
  const bestDay = bestEarningDay(worked, jobs);
  const topJob = jobData.slice().sort((a, b) => b.minutes - a.minutes)[0];

  const summaryCards = [
    { icon: Wallet, label: 'verdiend', value: formatCurrency(weekTotal, settings.currencySymbol), accent: 'var(--color-neon)' },
    { icon: Clock, label: 'gewerkt', value: formatDurationLong(weekMinutes), accent: 'var(--color-teal)' },
    { icon: TrendingUp, label: 'werksessies', value: String(weekSessions.length), accent: 'var(--color-info)' },
    { icon: Briefcase, label: 'jobs', value: String(weekJobsUsed), accent: 'var(--color-warn)' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="lg:hidden text-2xl font-bold text-[color:var(--color-ink)]">Statistieken</h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">Deze week</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ icon: Icon, label, value, accent }) => (
          <div key={label} className="glass-card rounded-3xl p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-3" style={{ background: `${accent}1f`, color: accent }}>
              <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-[color:var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              {value}
            </p>
            <p className="text-xs text-[color:var(--color-ink-faint)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-3xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)]">Gemiddeld</p>
          <p className="text-2xl font-bold text-[color:var(--color-neon)]" style={{ fontFamily: 'var(--font-display)' }}>
            {formatCurrency(avgHourly, settings.currencySymbol)}<span className="text-sm text-[color:var(--color-ink-faint)] font-medium">/uur</span>
          </p>
        </div>
        <div className="flex gap-6">
          {bestDay && (
            <div className="text-right">
              <p className="flex items-center gap-1.5 justify-end text-xs text-[color:var(--color-ink-faint)]"><Award size={12} /> Beste dag</p>
              <p className="text-sm font-semibold text-[color:var(--color-ink)]">{formatDayHeading(bestDay.date)}</p>
              <p className="text-xs text-[color:var(--color-neon)]">{formatCurrency(bestDay.amount, settings.currencySymbol)}</p>
            </div>
          )}
          {topJob && (
            <div className="text-right">
              <p className="text-xs text-[color:var(--color-ink-faint)]">Meest gewerkt</p>
              <p className="text-sm font-semibold text-[color:var(--color-ink)]">{topJob.job.icon} {topJob.job.name}</p>
              <p className="text-xs text-[color:var(--color-neon)]">{formatDurationLong(topJob.minutes)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <ChartCard title="Inkomsten per dag" subtitle="Deze week">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} formatter={moneyFormatter(settings.currencySymbol, 'Verdiend')} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="#39FFB0" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gewerkte uren per dag" subtitle="Deze week">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} width={32} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${Number(v) || 0}u`, 'Gewerkt'] as [string, string]} />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]} fill="#2FD9E8" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inkomsten per job" subtitle="Totaal">
          {jobData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-[color:var(--color-ink-faint)]">Nog geen data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={jobData} dataKey="amount" nameKey="job.name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {jobData.map((entry, i) => (
                    <Cell key={entry.job.id} fill={entry.job.color || CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: unknown, _n: unknown, item: { payload?: { job?: { name?: string } } }) =>
                    [formatCurrency(Number(v) || 0, settings.currencySymbol), item?.payload?.job?.name ?? ''] as [string, string]
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Week-over-week" subtitle="Vergelijking met vorige week">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wow}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} formatter={moneyFormatter(settings.currencySymbol, 'Verdiend')} />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {wow.map((entry, i) => (
                  <Cell key={entry.label} fill={i === 1 ? '#39FFB0' : 'rgba(255,255,255,0.15)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Maandelijkse inkomsten" subtitle="Laatste 6 maanden">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#56626f" fontSize={11} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} formatter={moneyFormatter(settings.currencySymbol, 'Verdiend')} />
              <Line type="monotone" dataKey="amount" stroke="#39FFB0" strokeWidth={2.5} dot={{ r: 3, fill: '#39FFB0' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
