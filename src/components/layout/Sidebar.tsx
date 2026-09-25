import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Logo from '../Logo';
import LiveBadge from './LiveBadge';
import Avatar from './Avatar';
import { NAV_ITEMS } from './nav';
import { useStore } from '../../store/useStore';

export default function Sidebar() {
  const active = useStore((s) => s.active);
  const name = useStore((s) => s.settings.profileName);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/80 px-4 py-6 backdrop-blur-xl lg:flex">
      <div className="mb-9 px-2">
        <Logo size={32} withTagline />
      </div>

      <nav className="flex flex-col gap-1" aria-label="Hoofdnavigatie">
        {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[color:var(--color-neon)]/10 text-[color:var(--color-ink)]'
                  : 'text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-fill-hover)] hover:text-[color:var(--color-ink)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[color:var(--color-neon)] shadow-[0_0_12px_var(--color-neon)]" />}
                <Icon size={18} strokeWidth={2} className={isActive ? 'text-[color:var(--color-neon)]' : ''} />
                <span>{label}</span>
                {to === '/' && active && <span className="ml-auto h-2 w-2 rounded-full bg-[color:var(--color-neon)] animate-[pulse-soft_2.4s_ease-in-out_infinite]" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <LiveBadge />

        <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] px-3.5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[color:var(--color-ink)]">VYNRA Free</span>
            <span className="rounded-full bg-[color:var(--color-neon)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--color-neon)]">Actief</span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-[color:var(--color-ink-faint)]">Alle kernfuncties · data blijft op dit apparaat</p>
        </div>

        <NavLink
          to="/instellingen"
          className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-[color:var(--color-fill-hover)]"
        >
          <Avatar name={name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">{name || 'Jouw profiel'}</p>
            <p className="truncate text-xs text-[color:var(--color-ink-faint)]">Profiel & instellingen</p>
          </div>
          <ChevronRight size={14} className="text-[color:var(--color-ink-faint)] group-hover:text-[color:var(--color-ink-muted)]" />
        </NavLink>
      </div>
    </aside>
  );
}
