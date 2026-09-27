import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <circle cx="9.5" cy="19.5" r="5" fill="none" stroke="var(--color-paper)" strokeWidth="2" />
      <circle cx="22.5" cy="19.5" r="5" fill="none" stroke="var(--color-paper)" strokeWidth="2" />
      <path d="M9.5 19.5 L14 11 L20 11 L22.5 19.5 M14 11 L16.5 19.5 L9.5 19.5" fill="none" stroke="var(--color-accent-bright)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ inverse, className }: { inverse?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="BikeBuilder AI home">
      <LogoMark className={inverse ? "text-white/10" : "text-ink"} />
      <span className={cn("font-display text-[17px] font-semibold tracking-[-0.02em]", inverse ? "text-white" : "text-ink")}>
        BikeBuilder<span className={inverse ? "text-accent-bright" : "text-accent"}> AI</span>
      </span>
    </Link>
  );
}
