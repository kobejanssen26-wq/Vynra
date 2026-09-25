import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import Logo from '../Logo';
import Button from '../ui/Button';
import SearchBox from './SearchBox';
import Notifications from './Notifications';
import Avatar from './Avatar';
import { useStore } from '../../store/useStore';
import { useUI } from '../../store/useUI';

export default function Topbar({ title }: { title?: string }) {
  const name = useStore((s) => s.settings.profileName);
  const active = useStore((s) => s.active);
  const setQuickStart = useUI((s) => s.setQuickStart);
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link to="/" className="lg:hidden" aria-label="VYNRA home">
          <Logo size={28} />
        </Link>
        {title && <h1 className="hidden text-lg font-semibold text-[color:var(--color-ink)] lg:block">{title}</h1>}

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden w-72 md:block">
            <SearchBox />
          </div>
          <button
            onClick={() => setMobileSearch(true)}
            aria-label="Zoeken"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-fill-hover)] hover:text-[color:var(--color-ink)] md:hidden"
          >
            <Search size={18} />
          </button>
          <Notifications />
          <Link to="/instellingen" aria-label="Profiel" className="rounded-full p-1 lg:hidden">
            <Avatar name={name} size={32} />
          </Link>
          <div className="hidden sm:block">
            <Button size="md" icon={<Plus size={16} />} onClick={() => setQuickStart(true)} disabled={!!active} title={active ? 'Er loopt al een sessie' : undefined}>
              Nieuwe sessie
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 md:hidden"
          >
            <SearchBox autoFocus onDone={() => setMobileSearch(false)} />
            <button onClick={() => setMobileSearch(false)} className="px-2 text-sm text-[color:var(--color-ink-muted)]">
              Sluiten
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
