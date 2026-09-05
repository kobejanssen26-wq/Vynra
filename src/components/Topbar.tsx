import { Bell, Plus, Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import Button from './ui/Button';

type Props = {
  onNewSession: () => void;
  title?: string;
};

export default function Topbar({ onNewSession, title }: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/80 backdrop-blur-xl px-4 sm:px-6 py-3.5">
      <div className="lg:hidden">
        <Logo size={26} withWordmark />
      </div>
      {title && <h1 className="hidden lg:block text-lg font-semibold text-[color:var(--color-ink)]">{title}</h1>}

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-white/[0.03] px-3 py-2 w-64">
          <Search size={15} className="text-[color:var(--color-ink-faint)]" />
          <input
            placeholder="Zoek sessies, jobs..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--color-ink-faint)]"
          />
        </div>

        <button
          aria-label="Zoeken"
          className="md:hidden rounded-xl p-2.5 text-[color:var(--color-ink-muted)] hover:bg-white/[0.06] hover:text-[color:var(--color-ink)]"
        >
          <Search size={18} />
        </button>

        <button
          aria-label="Notificaties"
          className="relative rounded-xl p-2.5 text-[color:var(--color-ink-muted)] hover:bg-white/[0.06] hover:text-[color:var(--color-ink)] transition-colors"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[color:var(--color-neon)]" />
        </button>

        <Link
          to="/instellingen"
          aria-label="Profiel & instellingen"
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--color-neon)]/30 to-[color:var(--color-teal)]/20 text-[color:var(--color-neon)]"
        >
          <User size={16} />
        </Link>

        <div className="hidden sm:block">
          <Button size="sm" icon={<Plus size={16} />} onClick={onNewSession}>
            Nieuwe sessie
          </Button>
        </div>
        <div className="sm:hidden">
          <Button size="sm" icon={<Plus size={16} />} onClick={onNewSession} className="!px-3" aria-label="Nieuwe sessie" />
        </div>
      </div>
    </header>
  );
}
