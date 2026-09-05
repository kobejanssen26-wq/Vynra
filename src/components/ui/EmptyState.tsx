import type { ReactNode } from 'react';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl border border-dashed border-[color:var(--color-border-strong)]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-[color:var(--color-neon)]">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[color:var(--color-ink)]">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm text-[color:var(--color-ink-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
