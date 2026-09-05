import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Pause, Play, Square } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { effectiveRate, formatCurrency, formatHMS, moneyFromSeconds, rateLabel } from '../../lib/calc';
import AnimatedAmount from '../ui/AnimatedAmount';
import Button from '../ui/Button';
import { Select } from '../ui/Field';

export default function LiveEarningsCard() {
  const jobs = useStore((s) => s.jobs);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const startSession = useStore((s) => s.startSession);
  const pauseSession = useStore((s) => s.pauseSession);
  const resumeSession = useStore((s) => s.resumeSession);
  const stopSession = useStore((s) => s.stopSession);

  const [pickJobId, setPickJobId] = useState(jobs[0]?.id ?? '');
  const [pickRateId, setPickRateId] = useState<string>('');
  const [justStopped, setJustStopped] = useState<{ amount: number } | null>(null);

  useTicker(!!active && !active.isPaused);

  const job = jobs.find((j) => j.id === (active?.jobId ?? pickJobId));

  const elapsedSeconds = useMemo(() => {
    if (!active) return 0;
    const running = active.isPaused ? 0 : Date.now() - active.segmentStart;
    return (active.accumulatedMs + running) / 1000;
  }, [active, active?.isPaused, active?.accumulatedMs, active?.segmentStart]);

  const rate = active ? effectiveRate(job, active.rateId) : effectiveRate(job, pickRateId || null);
  const earned = moneyFromSeconds(elapsedSeconds, rate);
  const perMinute = rate / 60;

  function handleStart() {
    if (!job) return;
    startSession(job.id, pickRateId || null);
  }

  function handleStop() {
    const amount = earned;
    stopSession();
    setJustStopped({ amount });
    setTimeout(() => setJustStopped(null), 2200);
  }

  const startedAtLabel = active ? new Date(active.sessionStart).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="relative overflow-hidden rounded-[28px] glass-card p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--color-neon), transparent 70%)' }}
      />

      <AnimatePresence mode="wait">
        {justStopped ? (
          <motion.div
            key="stopped"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative flex flex-col items-center justify-center py-10 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-neon)]/15 text-[color:var(--color-neon)]">
              <Check size={28} />
            </div>
            <p className="text-sm text-[color:var(--color-ink-muted)]">Sessie opgeslagen</p>
            <p className="mt-1 text-3xl font-bold text-[color:var(--color-neon)]" style={{ fontFamily: 'var(--font-display)' }}>
              +<AnimatedAmount value={justStopped.amount} symbol={settings.currencySymbol} />
            </p>
          </motion.div>
        ) : active ? (
          <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)]">Huidige sessie</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xl">{job?.icon}</span>
                  <span className="text-lg font-semibold text-[color:var(--color-ink)]">{job?.name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[color:var(--color-ink-faint)]">{rateLabel(job, active.rateId)}</p>
                <p className="text-sm font-medium text-[color:var(--color-neon)]">
                  {formatCurrency(rate, settings.currencySymbol)} / uur
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-xs text-[color:var(--color-ink-faint)] mb-1">
                  {active.isPaused ? 'Gepauzeerd' : 'gewerkt'} · gestart om {startedAtLabel}
                </p>
                <p className="text-4xl sm:text-5xl font-bold tabular text-[color:var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                  {formatHMS(elapsedSeconds)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-[color:var(--color-ink-faint)] mb-1">verdiend</p>
                <p className="text-4xl sm:text-5xl font-bold text-[color:var(--color-neon)]" style={{ fontFamily: 'var(--font-display)' }}>
                  <AnimatedAmount value={earned} symbol={settings.currencySymbol} />
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-ink-faint)]">
                  {formatCurrency(perMinute, settings.currencySymbol)} / minuut
                </p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              {active.isPaused ? (
                <Button size="lg" fullWidth icon={<Play size={18} fill="currentColor" />} onClick={resumeSession}>
                  Hervatten
                </Button>
              ) : (
                <Button size="lg" fullWidth variant="secondary" icon={<Pause size={18} />} onClick={pauseSession}>
                  Pauze
                </Button>
              )}
              <Button size="lg" fullWidth variant="outline" icon={<Square size={16} fill="currentColor" />} onClick={handleStop}>
                Stop
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)]">Geen actieve sessie</p>
            <h2 className="mt-1.5 text-2xl font-bold text-[color:var(--color-ink)]">Klaar om te beginnen?</h2>
            <p className="mt-1 text-sm text-[color:var(--color-ink-muted)]">Kies je job en tarief, en zet de klok aan.</p>

            {jobs.length === 0 ? (
              <p className="mt-6 text-sm text-[color:var(--color-ink-muted)]">
                Je hebt nog geen jobs. Maak er eerst één aan bij "Mijn jobs".
              </p>
            ) : (
              <>
                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  <Select value={pickJobId || job?.id} onChange={(e) => { setPickJobId(e.target.value); setPickRateId(''); }}>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.icon} {j.name} — {formatCurrency(j.baseRate, settings.currencySymbol)}/u
                      </option>
                    ))}
                  </Select>
                  <Select value={pickRateId} onChange={(e) => setPickRateId(e.target.value)}>
                    <option value="">Normaal — {formatCurrency(job?.baseRate ?? 0, settings.currencySymbol)}/u</option>
                    {job?.rateRules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} — {formatCurrency(job.baseRate + r.delta, settings.currencySymbol)}/u
                      </option>
                    ))}
                  </Select>
                </div>

                <Button size="lg" fullWidth className="mt-6" icon={<Play size={20} fill="currentColor" />} onClick={handleStart}>
                  Start
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
