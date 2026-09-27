"use client";

import { SeverityIcon } from "@/components/ui/badge";
import type { CompatibilityReport } from "@/lib/compatibility/engine";
import { cn } from "@/lib/utils";

export function CompatibilityPanel({ report }: { report: CompatibilityReport }) {
  const applicable = report.rules.filter((r) => r.applicable);
  const passed = applicable.filter((r) => r.status === "ok" || r.status === "info").length;
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Compatibility</h2>
          <p className="mt-1 text-[14px] text-muted">
            {passed} of {applicable.length} checks passed
            {report.errorCount > 0 && <> · <span className="text-danger">{report.errorCount} error{report.errorCount > 1 ? "s" : ""}</span></>}
            {report.warningCount > 0 && <> · <span className="text-warn">{report.warningCount} warning{report.warningCount > 1 ? "s" : ""}</span></>}
          </p>
        </div>
      </div>
      <ul className="mt-6 grid items-start gap-2 md:grid-cols-2">
        {report.rules.map((r) => (
          <li key={r.id} className={cn("rounded-md border bg-white px-4 py-3", r.status === "error" ? "border-danger/30" : r.status === "warning" ? "border-warn/30" : "border-line", !r.applicable && "opacity-50")}>
            <div className="flex items-center gap-2.5">
              <SeverityIcon severity={r.applicable ? (r.status === "info" ? "ok" : r.status) : "info"} />
              <span className="text-[14px] font-medium text-ink">{r.label}</span>
              {!r.applicable && <span className="ml-auto text-[12px] text-muted">Needs more parts</span>}
            </div>
            {r.issues.map((i) => (
              <p key={i.message} className="mt-1.5 pl-[26px] text-[13px] leading-relaxed text-muted">
                {i.message}
                {i.fix && <span className="text-ink-3"> {i.fix}</span>}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
