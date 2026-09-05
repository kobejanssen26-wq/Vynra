import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FilterSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative inline-flex">
      <select
        {...props}
        className={`appearance-none cursor-pointer rounded-xl border border-[color:var(--color-border-strong)] bg-white/[0.03] pl-3.5 pr-8 py-2 text-sm text-[color:var(--color-ink)] outline-none transition-colors focus:border-[color:var(--color-neon)]/60 focus:bg-white/[0.05] ${props.className ?? ''}`}
      />
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink-faint)]" />
    </div>
  );
}
