import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal, Play } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';
import { useTicker } from '../../lib/useTicker';
import { formatCurrency } from '../../lib/calc';
import { activeEarnings } from '../../lib/stats';
import { NAV_ITEMS } from './nav';
import Logo from '../Logo';

const PRIMARY = ['/', '/kalender'];
const SECONDARY = ['/geschiedenis'];
const MORE = ['/jobs', '/statistieken', '/spaardoelen', '/instellingen'];

function Item({ to }: { to: string }) {
  const item = NAV_ITEMS.find((n) => n.to === to)!;
  const Icon = item.icon;
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${
          isActive ? 'text-[color:var(--color-neon)]' : 'text-[color:var(--color-ink-faint)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={21} strokeWidth={isActive ? 2.3 : 1.8} />
          <span>{item.short}</span>
        </>
      )}
    </NavLink>
  );
}

/** Mobile navigation: the start/live button sits in the middle, always one tap away. */
export default function BottomNav() {
  const active = useStore((s) => s.active);
  const jobs = useStore((s) => s.jobs);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const setQuickStart = useUI((s) => s.setQuickStart);
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const now = useTicker(!!active && !active.isPaused);
  const moreActive = MORE.includes(location.pathname);

  return (
    <>
      <nav
        aria-label="Navigatie"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch px-2">
          {PRIMARY.map((to) => (
            <Item key={to} to={to} />
          ))}

          <div className="flex flex-1 items-start justify-center">
            <button
              onClick={() => (active ? navigate('/') : setQuickStart(true))}
              aria-label={active ? 'Naar lopende sessie' : 'Sessie starten'}
              className={`-mt-5 flex h-16 min-w-16 flex-col items-center justify-center rounded-full px-3 shadow-[0_8px_30px_-6px_rgba(57,255,176,0.6)] ring-4 ring-[color:var(--color-bg-elevated)] transition-transform active:scale-95 ${
                active ? 'bg-[color:var(--color-surface-raised)] text-[color:var(--color-neon)]' : 'bg-[color:var(--color-neon)] text-[#04140d]'
              }`}
            >
              {active ? (
                <>
                  <span className={`h-1.5 w-1.5 rounded-full ${active.isPaused ? 'bg-[color:var(--color-warn)]' : 'bg-[color:var(--color-neon)] animate-[pulse-soft_1.6s_ease-in-out_infinite]'}`} />
                  <span className="num mt-0.5 text-xs font-bold">{formatCurrency(activeEarnings(active, jobs, now), symbol)}</span>
                </>
              ) : (
                <Play size={24} fill="currentColor" className="ml-0.5" />
              )}
            </button>
          </div>

          {SECONDARY.map((to) => (
            <Item key={to} to={to} />
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${moreActive ? 'text-[color:var(--color-neon)]' : 'text-[color:var(--color-ink-faint)]'}`}
          >
            <MoreHorizontal size={21} />
            <span>Meer</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-[color:var(--color-border-strong)] bg-[color:var(--color-bg-elevated)] px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[color:var(--color-track)]" />
              <div className="grid grid-cols-2 gap-2.5">
                {MORE.map((to) => {
                  const item = NAV_ITEMS.find((n) => n.to === to)!;
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-medium ${
                          isActive
                            ? 'border-[color:var(--color-neon)]/40 bg-[color:var(--color-neon)]/[0.08] text-[color:var(--color-ink)]'
                            : 'border-[color:var(--color-border)] bg-[color:var(--color-fill)] text-[color:var(--color-ink-muted)]'
                        }`
                      }
                    >
                      <Icon size={19} className="text-[color:var(--color-neon)]" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
              <div className="mt-5 flex justify-center opacity-70">
                <Logo size={18} withTagline />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
