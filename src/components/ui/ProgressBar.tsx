import { motion } from 'framer-motion';

type Props = {
  value: number; // 0-100
  color?: string;
  height?: number;
  trackClassName?: string;
};

export default function ProgressBar({ value, color = 'var(--color-neon)', height = 8, trackClassName = '' }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-white/[0.06] ${trackClassName}`}
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 60%, #2FD9E8))` }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
