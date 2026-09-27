import { AlertTriangle, Check, Info, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "warn" | "danger" | "info" | "dark";

const TONES: Record<Tone, string> = {
  neutral: "bg-paper-2 text-ink-3 border-line",
  accent: "bg-accent-soft text-accent-strong border-accent/15",
  warn: "bg-warn-soft text-warn border-warn/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
  dark: "bg-ink text-paper border-ink",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11.5px] font-medium leading-none", TONES[tone], className)}>
      {children}
    </span>
  );
}

const STATUS: Record<Severity, { tone: Tone; label: string; Icon: typeof Check }> = {
  ok: { tone: "accent", label: "Compatible", Icon: Check },
  info: { tone: "accent", label: "Compatible", Icon: Check },
  warning: { tone: "warn", label: "Check fit", Icon: AlertTriangle },
  error: { tone: "danger", label: "Incompatible", Icon: X },
};

export function StatusBadge({ status, className, label }: { status: Severity; className?: string; label?: string }) {
  const s = STATUS[status];
  return (
    <Badge tone={s.tone} className={className}>
      <s.Icon className="size-3" strokeWidth={2.5} aria-hidden />
      {label ?? s.label}
    </Badge>
  );
}

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const Icon = severity === "error" ? X : severity === "warning" ? AlertTriangle : severity === "info" ? Info : Check;
  const color = severity === "error" ? "text-danger" : severity === "warning" ? "text-warn" : severity === "info" ? "text-info" : "text-accent";
  return <Icon className={cn("size-4 shrink-0", color, className)} strokeWidth={2.25} aria-hidden />;
}
