import { NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  CalendarDays,
  Briefcase,
  BarChart3,
  History,
  Target,
  Settings as SettingsIcon,
  User,
  ChevronRight,
} from 'lucide-react';
import Logo from './Logo';
import { useStore } from '../store/useStore';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/jobs', label: 'Mijn jobs', icon: Briefcase },
  { to: '/statistieken', label: 'Statistieken', icon: BarChart3 },
  { to: '/geschiedenis', label: 'Geschiedenis', icon: History },
  { to: '/spaardoelen', label: 'Spaardoelen', icon: Target },
  { to: '/instellingen', label: 'Instellingen', icon: SettingsIcon },
];

export default function Sidebar() {
  const active = useStore((s) => s.active);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[248px] flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/80 backdrop-blur-xl px-4 py-6 z-40">
      <div className="px-2 mb-8">
        <Logo size={30} withTagline />
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[color:var(--color-neon)]/10 text-[color:var(--color-neon)]'
                  : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-[color:var(--color-neon)] shadow-[0_0_12px_var(--color-neon)]" />
                )}
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
                {to === '/' && active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-[color:var(--color-neon)] animate-[pulse-soft_2.4s_ease-in-out_infinite]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button className="mt-4 group flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] px-3.5 py-3 text-left hover:bg-white/[0.05] transition-colors">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--color-neon)]/30 to-[color:var(--color-teal)]/20 text-[color:var(--color-neon)]">
          <User size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">Jouw profiel</p>
          <p className="truncate text-xs text-[color:var(--color-ink-faint)]">Vynra Free plan</p>
        </div>
        <ChevronRight size={14} className="text-[color:var(--color-ink-faint)] group-hover:text-[color:var(--color-ink-muted)]" />
      </button>
    </aside>
  );
}
