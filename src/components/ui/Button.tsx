import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[color:var(--color-neon)] text-[#04140d] font-semibold shadow-[0_0_0_1px_rgba(57,255,176,0.4),0_8px_30px_-8px_rgba(57,255,176,0.55)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-[color:var(--color-fill-hover)] text-[color:var(--color-ink)] border border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-fill-hover)]',
  outline:
    'bg-transparent text-[color:var(--color-ink)] border border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-fill-hover)]',
  ghost: 'bg-transparent text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-fill-hover)]',
  danger: 'bg-[color:var(--color-danger)]/15 text-[color:var(--color-danger)] border border-[color:var(--color-danger)]/30 hover:bg-[color:var(--color-danger)]/25',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-xl',
  md: 'text-sm px-4 py-2.5 gap-2 rounded-2xl',
  lg: 'text-base px-6 py-3.5 gap-2.5 rounded-2xl',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
