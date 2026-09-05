import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

type FieldWrapProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function FieldWrap({ label, children, hint }: FieldWrapProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[color:var(--color-ink-muted)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[color:var(--color-ink-faint)]">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl border border-[color:var(--color-border-strong)] bg-white/[0.03] px-3.5 py-2.5 text-sm text-[color:var(--color-ink)] outline-none transition-colors focus:border-[color:var(--color-neon)]/60 focus:bg-white/[0.05]';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputBase} appearance-none cursor-pointer ${props.className ?? ''}`}
    />
  );
}
