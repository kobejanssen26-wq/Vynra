import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';
import { useDismiss } from '../../lib/useDismiss';
import { formatCurrency, formatShortDate, hm, sessionEarnings } from '../../lib/calc';
import { NAV_ITEMS } from './nav';

type Result = { id: string; icon: string; title: string; meta: string; onSelect: () => void };

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Searches pages, jobs, goals and sessions (by job, note or date). */
export default function SearchBox({ autoFocus, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const navigate = useNavigate();
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const openSession = useUI((s) => s.openSession);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    onDone?.();
  }, [onDone]);
  useDismiss(ref, open, close);

  const results = useMemo<Result[]>(() => {
    const term = norm(q.trim());
    if (!term) return [];
    const go = (to: string) => () => navigate(to);
    const out: Result[] = [];
    for (const n of NAV_ITEMS) if (norm(n.label).includes(term)) out.push({ id: n.to, icon: '↗', title: n.label, meta: 'Pagina', onSelect: go(n.to) });
    for (const j of jobs) if (!j.archived && norm(j.name).includes(term)) out.push({ id: j.id, icon: j.icon, title: j.name, meta: `Job · ${formatCurrency(j.baseRate, symbol)}/u`, onSelect: go('/jobs') });
    for (const g of goals) if (norm(g.name).includes(term)) out.push({ id: g.id, icon: g.icon, title: g.name, meta: 'Spaardoel', onSelect: go('/spaardoelen') });
    const matched = sessions
      .filter((s) => {
        const job = jobs.find((j) => j.id === s.jobId);
        return norm(`${job?.name ?? ''} ${s.note ?? ''} ${formatShortDate(s.date)} ${s.date}`).includes(term);
      })
      .sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
      .slice(0, 6);
    for (const s of matched) {
      const job = jobs.find((j) => j.id === s.jobId);
      out.push({
        id: s.id,
        icon: job?.icon ?? '•',
        title: `${job?.name ?? 'Sessie'} · ${formatShortDate(s.date)}`,
        meta: `${hm(s.startTime)}–${hm(s.endTime)} · ${formatCurrency(sessionEarnings(s, job), symbol)}${s.kind === 'planned' ? ' verwacht' : ''}`,
        onSelect: () => openSession({ editSession: s }),
      });
    }
    return out.slice(0, 10);
  }, [q, jobs, goals, sessions, symbol, navigate, openSession]);

  function select(r: Result) {
    r.onSelect();
    setQ('');
    close();
  }

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] px-3 py-2 focus-within:border-[color:var(--color-neon)]/50">
        <Search size={15} className="shrink-0 text-[color:var(--color-ink-faint)]" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setCursor(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter' && results[cursor]) {
              select(results[cursor]);
            }
          }}
          placeholder="Zoek sessies, jobs, doelen…"
          aria-label="Zoeken"
          className="w-full bg-transparent text-sm outline-none"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Wissen" className="text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink)]">
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && q.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] p-1.5 shadow-2xl"
          >
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-[color:var(--color-ink-faint)]">Niets gevonden voor "{q}"</p>
            ) : (
              results.map((r, i) => (
                <button
                  key={r.id}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => select(r)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === cursor ? 'bg-[color:var(--color-fill-hover)]' : ''}`}
                >
                  <span className="w-5 text-center">{r.icon === '↗' ? <ArrowUpRight size={15} className="inline text-[color:var(--color-ink-faint)]" /> : r.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-[color:var(--color-ink)]">{r.title}</span>
                    <span className="block truncate text-xs text-[color:var(--color-ink-faint)]">{r.meta}</span>
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
