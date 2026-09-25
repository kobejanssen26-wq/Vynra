import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { hm, nowHM, todayISO } from '../../lib/calc';
import Button from '../ui/Button';

export type ForgotPrefill = { jobId: string; rateId: string | null; start: string };

type Props = {
  onFix: (prefill?: ForgotPrefill) => void;
};

const KEY = 'vynra-forgot-dismissed';

function readDismissed(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Nudges when it looks like work started without the timer: a planned shift that already began,
 * or nothing tracked yet today during working hours.
 */
export default function ForgottenStartBanner({ onFix }: Props) {
  const active = useStore((s) => s.active);
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const [dismissed, setDismissed] = useState(() => readDismissed() === todayISO());

  const today = todayISO();
  const now = nowHM();
  const trackedToday = sessions.some((s) => s.date === today && s.kind !== 'planned');
  const missedPlan = sessions.find((s) => s.date === today && s.kind === 'planned' && hm(s.startTime) <= now && hm(s.endTime) > now);
  const hour = new Date().getHours();

  if (active || dismissed || jobs.length === 0) return null;
  if (!missedPlan && (trackedToday || hour < 9 || hour > 21)) return null;

  const job = missedPlan ? jobs.find((j) => j.id === missedPlan.jobId) : undefined;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(KEY, today);
    } catch {
      /* private mode: dismissal just won't persist */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[color:var(--color-warn)]/25 bg-[color:var(--color-warn)]/[0.07] px-4 py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-warn)]/15 text-[color:var(--color-warn)]">
        <Clock size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[color:var(--color-ink)]">Vergeten te starten?</p>
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          {missedPlan && job
            ? `Je stond om ${hm(missedPlan.startTime)} ingepland voor ${job.icon} ${job.name}. Je kunt je echte starttijd nog invoeren.`
            : 'Je kunt je echte starttijd nog invoeren.'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onFix(missedPlan ? { jobId: missedPlan.jobId, rateId: missedPlan.rateId, start: hm(missedPlan.startTime) } : undefined)}
        >
          Tijd aanpassen
        </Button>
        <button onClick={dismiss} aria-label="Sluiten" className="rounded-lg p-2 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)]">
          <X size={15} />
        </button>
      </div>
    </motion.div>
  );
}
