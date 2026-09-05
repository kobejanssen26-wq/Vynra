import { NavLink } from 'react-router-dom';
import { LayoutGrid, CalendarDays, Briefcase, BarChart3, History } from 'lucide-react';

const ITEMS = [
  { to: '/', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/kalender', label: 'Kalender', icon: CalendarDays },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/statistieken', label: 'Stats', icon: BarChart3 },
  { to: '/geschiedenis', label: 'Historie', icon: History },
];

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-elevated)]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between px-1">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                isActive ? 'text-[color:var(--color-neon)]' : 'text-[color:var(--color-ink-faint)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
