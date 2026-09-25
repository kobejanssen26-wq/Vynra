import { motion } from 'framer-motion';

type Props = {
  value: number; // 0-100
  color?: string;
  height?: number;
  animateOnMount?: boolean;
};

export default function ProgressBar({ value, color = 'var(--color-neon)', height = 8, animateOnMount = true }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative w-full overflow-hidden rounded-full bg-[color:var(--color-track)]"
      style={{ height }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${color} 75%, var(--color-teal)), ${color})`, boxShadow: `0 0 12px -2px ${color}` }}
        initial={animateOnMount ? { width: 0 } : false}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
