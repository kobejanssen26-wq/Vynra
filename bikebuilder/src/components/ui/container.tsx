import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

export function SectionHeading({ eyebrow, title, lead, className, align = "left", inverse }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; className?: string; align?: "left" | "center"; inverse?: boolean }) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className={cn("eyebrow mb-4", inverse ? "text-accent-bright" : "text-accent")}>{eyebrow}</p>}
      <h2 className={cn("font-display text-3xl font-semibold tracking-[-0.025em] sm:text-[42px] sm:leading-[1.08]", inverse ? "text-white" : "text-ink")}>{title}</h2>
      {lead && <p className={cn("mt-4 text-[17px] leading-relaxed", inverse ? "text-white/65" : "text-muted")}>{lead}</p>}
    </div>
  );
}
