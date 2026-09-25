import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock3, Pause, PencilLine, Play, Square } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { effectiveRate, formatCurrency, formatDurationLong, formatHMS, rateLabel, sessionEarnings, sessionMinutes, timeOf } from '../../lib/calc';
import { activeWorkedSeconds, visibleJobs } from '../../lib/stats';
import type { Session } from '../../types';
import AnimatedAmount from '../ui/AnimatedAmount';
import Button from '../ui/Button';
import JobPicker from '../JobPicker';
import StopSessionModal from './StopSessionModal';
import AdjustStartModal from './AdjustStartModal';

type Props = {
  onForgotStart: () => void;
};

export default function LiveEarningsCard({ onForgotStart }: Props) {
  const allJobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const startSession = useStore((s) => s.startSession);
  const pauseSession = useStore((s) => s.pauseSession);
  const resumeSession = useStore((s) => s.resumeSession);

  const jobs = visibleJobs(allJobs);
  // Default to the job used most recently — usually the one you're about to start again.
  const lastJobId = sessions.filter((s) => s.kind !== 'planned').sort((a, b) => b.createdAt - a.createdAt)[0]?.jobId;
  const [pickJobId, setPickJobId] = useState(() => (jobs.some((j) => j.id === lastJobId) ? lastJobId! : jobs[0]?.id ?? ''));
  const [pickRateId, setPickRateId] = useState<string | null>(null);
  const [stopOpen, setStopOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [saved, setSaved] = useState<Session | null>(null);

  const now = useTicker(!!active);

  const pickJob = jobs.find((j) => j.id === pickJobId) ?? jobs[0];
  const job = active ? allJobs.find((j) => j.id === active.jobId) : pickJob;
  const rate = active ? effectiveRate(job, active.rateId) : effectiveRate(pickJob, pickRateId);

  const worked = active ? activeWorkedSeconds(active, now) : 0;
  const earned = (worked / 3600) * rate;
  // Total session length on the wall clock, pauses included.
  const totalSeconds = active ? Math.max(worked, (now - active.sessionStart) / 1000) : 0;

  function handleStart() {
    if (!pickJob) return;
    setSaved(null);
    startSession(pickJob.id, pickRateId);
  }

  function handleSaved(session: Session) {
    setStopOpen(false);
    setSaved(session);
    setTimeout(() => setSaved((s) => (s?.id === session.id ? null : s)), 5000);
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] glass-card p-5 sm:p-8">
      <div
        className={`pointer-events-none absolute -top-28 -right-24 h-80 w-80 rounded-full blur-3xl transition-opacity duration-700 ${active && !active.isPaused ? 'opacity-30' : 'opacity-15'}`}
        style={{ background: 'radial-gradient(circle, var(--color-neon), transparent 70%)' }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {saved ? (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex flex-col items-center justify-center py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-neon)]/15 text-[color:var(--color-neon)]"
            >
              <Check size={28} />
            </motion.div>
            <p className="text-sm text-[color:var(--color-ink-muted)]">Sessie opgeslagen</p>
            <p className="num mt-1 text-4xl font-bold text-[color:var(--color-neon)]">+{formatCurrency(sessionEarnings(saved, allJobs.find((j) => j.id === saved.jobId)), symbol)}</p>
            <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">
              {formatDurationLong(sessionMinutes(saved))} gewerkt · {allJobs.find((j) => j.id === saved.jobId)?.name}
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSaved(null)}>
                Nieuwe sessie
              </Button>
              <Link to="/geschiedenis" className="inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]">
                Bekijk geschiedenis
              </Link>
            </div>
          </motion.div>
        ) : active ? (
          <motion.div key="active" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">
                  <span className="relative flex h-2 w-2">
                    {!active.isPaused && <span className="absolute inset-0 rounded-full bg-[color:var(--color-neon)] animate-[ring-out_1.6s_ease-out_infinite]" />}
                    <span className={`relative h-2 w-2 rounded-full ${active.isPaused ? 'bg-[color:var(--color-warn)]' : 'bg-[color:var(--color-neon)]'}`} />
                  </span>
                  {active.isPaused ? 'Gepauzeerd' : 'Huidige sessie'}
                </p>
                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-[color:var(--color-ink)]">
                  <span className="text-2xl">{job?.icon}</span>
                  <span className="truncate">{job?.name}</span>
                </p>
              </div>
              <div className="shrink-0 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] px-3 py-2 text-right">
                <p className="num text-sm font-semibold text-[color:var(--color-ink)]">{formatCurrency(rate, symbol)} / uur</p>
                <p className="text-[11px] text-[color:var(--color-ink-muted)]">{rateLabel(job, active.rateId)}</p>
              </div>
            </div>

            <div className="mt-7 sm:mt-9">
              <p className="text-xs text-[color:var(--color-ink-muted)]">verdiend</p>
              <p className={`num mt-1 text-[3.25rem] leading-none sm:text-7xl font-bold transition-colors ${active.isPaused ? 'text-[color:var(--color-ink-muted)]' : 'text-[color:var(--color-neon)]'}`}>
                <AnimatedAmount value={earned} symbol={symbol} />
              </p>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <p className="num text-2xl sm:text-3xl font-semibold text-[color:var(--color-ink)]">{formatHMS(worked)}</p>
                <p className="text-sm text-[color:var(--color-ink-muted)]">gewerkt</p>
                <p className="text-sm text-[color:var(--color-ink-muted)] tabular">{formatCurrency(rate / 60, symbol)} / minuut</p>
              </div>
            </div>

            <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-4">
              <Meta label="Uurloon" value={`${formatCurrency(rate, symbol)}`} />
              <Meta label="Tarief" value={rateLabel(job, active.rateId)} />
              <div className="bg-[color:var(--color-bg-elevated)] px-4 py-3">
                <dt className="text-[11px] text-[color:var(--color-ink-faint)]">Gestart om</dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  <span className="num text-sm font-semibold text-[color:var(--color-ink)]">{timeOf(new Date(active.sessionStart))}</span>
                  <button
                    onClick={() => setAdjustOpen(true)}
                    className="rounded-md p-1 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-fill-hover)] hover:text-[color:var(--color-neon)]"
                    aria-label="Starttijd aanpassen"
                    title="Starttijd aanpassen"
                  >
                    <PencilLine size={13} />
                  </button>
                </dd>
              </div>
              <Meta label="Totale sessieduur" value={formatHMS(totalSeconds)} />
            </dl>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {active.isPaused ? (
                <Button size="lg" fullWidth icon={<Play size={18} fill="currentColor" />} onClick={resumeSession} className="h-14 sm:h-auto">
                  Hervatten
                </Button>
              ) : (
                <Button size="lg" fullWidth variant="secondary" icon={<Pause size={18} />} onClick={pauseSession} className="h-14 sm:h-auto">
                  Pauze
                </Button>
              )}
              <Button size="lg" fullWidth variant="outline" icon={<Square size={15} fill="currentColor" />} onClick={() => setStopOpen(true)} className="h-14 sm:h-auto">
                Stop
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">Geen actieve sessie</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
              Klaar om te beginnen?
            </h2>

            {jobs.length === 0 ? (
              <div className="mt-6">
                <p className="text-sm text-[color:var(--color-ink-muted)]">Maak eerst een job aan — daarna start je met één tik.</p>
                <Link to="/jobs" className="mt-4 inline-flex">
                  <Button>Nieuwe job</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <JobPicker jobId={pickJob?.id ?? ''} rateId={pickRateId} onJobChange={setPickJobId} onRateChange={setPickRateId} />
                </div>

                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-[color:var(--color-ink-muted)]">Je verdient</p>
                    <p className="num text-3xl sm:text-4xl font-bold text-[color:var(--color-ink)]">
                      {formatCurrency(rate, symbol)}
                      <span className="text-base font-medium text-[color:var(--color-ink-muted)]"> / uur</span>
                    </p>
                  </div>
                  <p className="pb-1 text-sm text-[color:var(--color-ink-muted)] tabular">{formatCurrency(rate / 60, symbol)} / minuut</p>
                </div>

                <div className="relative mt-6">
                  <Button size="lg" fullWidth className="h-16 text-lg" icon={<Play size={22} fill="currentColor" />} onClick={handleStart}>
                    Start
                  </Button>
                </div>
                <button
                  onClick={onForgotStart}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 py-1 text-sm text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]"
                >
                  <Clock3 size={14} /> Al eerder begonnen? Vul je echte starttijd in
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <StopSessionModal open={stopOpen} onClose={() => setStopOpen(false)} onSaved={handleSaved} />
      <AdjustStartModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--color-bg-elevated)] px-4 py-3">
      <dt className="text-[11px] text-[color:var(--color-ink-faint)]">{label}</dt>
      <dd className="num mt-0.5 truncate text-sm font-semibold text-[color:var(--color-ink)]">{value}</dd>
    </div>
  );
}
