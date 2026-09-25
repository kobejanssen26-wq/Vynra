import { User } from 'lucide-react';

export default function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--color-neon)]/30 to-[color:var(--color-teal)]/15 text-xs font-bold text-[color:var(--color-neon)] ring-1 ring-[color:var(--color-neon)]/20"
      style={{ width: size, height: size }}
    >
      {initials || <User size={size * 0.44} />}
    </span>
  );
}
