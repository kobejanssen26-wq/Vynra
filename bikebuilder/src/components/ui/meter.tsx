import { cn } from "@/lib/utils";

/** Horizontal bar for 0–max values. */
export function Meter({ value, max = 100, className, tone = "ink" }: { value: number; max?: number; className?: string; tone?: "ink" | "accent" | "light" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full", tone === "light" ? "bg-white/10" : "bg-ink/8", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone === "accent" ? "bg-accent" : tone === "light" ? "bg-accent-bright" : "bg-ink")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
