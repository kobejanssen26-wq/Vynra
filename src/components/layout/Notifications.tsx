import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useDismiss } from '../../lib/useDismiss';
import { addDays, formatCurrency, formatDurationLong, hm, nowHM, relativeDayLabel, sessionEarnings, todayISO } from '../../lib/calc';
import { averageHourlyValue, goalJourney, journeyGoal, workedSessions } from '../../lib/stats';

type Item = { id: string; icon: string; title: string; body: string; to: string };

const SEEN_KEY = 'vynra-notif-seen';

/** Derived, local notifications: upcoming shifts, a missed start, goal progress. */
export default function Notifications() {
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const goals = useStore((s) => s.goals);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const items = useMemo<Item[]>(() => {
    const today = todayISO();
    const out: Item[] = [];
    const upcoming = sessions
      .filter((s) => s.kind === 'planned' && s.date >= today && s.date <= addDays(today, 2))
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    for (const s of upcoming) {
      const job = jobs.find((j) => j.id === s.jobId);
      const missed = s.date === today && hm(s.startTime) <= nowHM() && !active;
      out.push({
        id: `plan-${s.id}`,
        icon: missed ? '⏰' : job?.icon ?? '📅',
        title: missed ? `Vergeten te starten? ${job?.name}` : `${relativeDayLabel(s.date)}: ${job?.name}`,
        body: `${hm(s.startTime)} – ${hm(s.endTime)} · ${formatCurrency(sessionEarnings(s, job), settings.currencySymbol)} verwacht`,
        to: missed ? '/' : '/kalender',
      });
    }
    const goal = journeyGoal(goals);
    if (goal && goal.currentAmount < goal.targetAmount) {
      const rate = averageHourlyValue(workedSessions(sessions), jobs) || settings.defaultRate;
      const j = goalJourney(goal, rate);
      out.push({
        id: `goal-${goal.id}-${Math.floor(j.progress / 10)}`,
        icon: goal.icon,
        title: `${goal.name}: ${j.progress.toFixed(0)}%`,
        body: `Nog ${formatDurationLong(j.remainingHours * 60)} werk tot je doel.`,
        to: '/spaardoelen',
      });
    }
    return out;
  }, [sessions, jobs, goals, active, settings.currencySymbol, settings.defaultRate]);

  const signature = items.map((i) => i.id).join('|');
  const unread = settings.notifications && items.length > 0 && signature !== seen;

  function toggle() {
    setOpen((o) => !o);
    if (!open) {
      setSeen(signature);
      try {
        localStorage.setItem(SEEN_KEY, signature);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="Notificaties"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--color-ink-muted)] transition-colors hover:bg-[color:var(--color-fill-hover)] hover:text-[color:var(--color-ink)]"
      >
        <Bell size={18} />
        {unread && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[color:var(--color-neon)] ring-2 ring-[color:var(--color-bg)]" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="fixed left-4 right-4 top-16 z-50 origin-top-right rounded-2xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] p-2 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
          >
            <p className="px-2.5 pb-1.5 pt-1 text-xs font-semibold text-[color:var(--color-ink)]">Notificaties</p>
            {!settings.notifications ? (
              <p className="flex items-center gap-2 px-2.5 py-4 text-sm text-[color:var(--color-ink-faint)]">
                <BellOff size={15} /> Meldingen staan uit in Instellingen.
              </p>
            ) : items.length === 0 ? (
              <p className="px-2.5 py-4 text-sm text-[color:var(--color-ink-faint)]">Alles bijgewerkt. Geen geplande diensten in de komende dagen.</p>
            ) : (
              items.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    navigate(i.to);
                    close();
                  }}
                  className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-[color:var(--color-fill-hover)]"
                >
                  <span className="mt-0.5 text-base">{i.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm text-[color:var(--color-ink)]">{i.title}</span>
                    <span className="block text-xs text-[color:var(--color-ink-muted)] tabular">{i.body}</span>
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
