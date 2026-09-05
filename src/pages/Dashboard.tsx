import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDayHeading, todayISO } from '../lib/calc';
import { totalEarnings, workedSessions } from '../lib/stats';
import LiveEarningsCard from '../components/dashboard/LiveEarningsCard';
import NextMilestoneCard from '../components/dashboard/NextMilestoneCard';
import TimeValueCard from '../components/dashboard/TimeValueCard';
import MoneyJourneyCard from '../components/dashboard/MoneyJourneyCard';
import ForgottenStartBanner from '../components/dashboard/ForgottenStartBanner';
import JobsStrip from '../components/dashboard/JobsStrip';
import SessionModal from '../components/SessionModal';

export default function Dashboard() {
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);
  const [forgottenOpen, setForgottenOpen] = useState(false);

  const todaySessions = workedSessions(sessions).filter((s) => s.date === todayISO());
  const todayTotal = totalEarnings(todaySessions, jobs);
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const guessStart = new Date(now.getTime() - 30 * 60 * 1000);
  const guessStartHM = `${pad(guessStart.getHours())}:${pad(guessStart.getMinutes())}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="lg:hidden text-2xl font-bold text-[color:var(--color-ink)]">Dashboard</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)] mt-1 lg:mt-0">{formatDayHeading(todayISO())}</p>
        </div>
        {todayTotal > 0 && (
          <div className="text-right">
            <p className="text-xs text-[color:var(--color-ink-faint)]">Vandaag verdiend</p>
            <p className="text-lg font-semibold text-[color:var(--color-neon)]">{formatCurrency(todayTotal, settings.currencySymbol)}</p>
          </div>
        )}
      </div>

      <ForgottenStartBanner onFix={() => setForgottenOpen(true)} />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <LiveEarningsCard />
        </div>
        <div className="flex flex-col gap-5">
          <NextMilestoneCard />
          <TimeValueCard />
          <MoneyJourneyCard />
        </div>
      </div>

      <JobsStrip />

      <SessionModal
        open={forgottenOpen}
        onClose={() => setForgottenOpen(false)}
        defaultDate={todayISO()}
        prefill={{ jobId: jobs[0]?.id, startTime: guessStartHM, endTime: nowHM }}
        title="Vergeten te starten?"
        subtitle="Vul je echte starttijd in — VYNRA berekent de rest automatisch."
      />
    </div>
  );
}
