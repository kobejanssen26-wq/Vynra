type Option<T extends string> = { value: T; label: string; disabled?: boolean };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  className?: string;
};

export default function Segmented<T extends string>({ value, options, onChange, size = 'md', className = '' }: Props<T>) {
  return (
    <div role="radiogroup" className={`flex rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] p-1 ${className}`}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-xl font-medium transition-all disabled:opacity-35 ${size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'} ${
              selected
                ? 'bg-[color:var(--color-surface-raised)] text-[color:var(--color-ink)] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_4px_14px_-6px_rgba(0,0,0,0.6)]'
                : 'text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
