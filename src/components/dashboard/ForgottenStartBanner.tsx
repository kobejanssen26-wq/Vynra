import { useMemo, useState } from 'react';
import { X, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { todayISO } from '../../lib/calc';
import Button from '../ui/Button';

type Props = {
  onFix: () => void;
};

export default function ForgottenStartBanner({ onFix }: Props) {
  const active = useStore((s) => s.active);
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const [dismissed, setDismissed] = useState(false);

  const hasWorkedToday = useMemo(
    () => sessions.some((s) => s.date === todayISO() && (s.kind === 'worked' || s.kind === 'manual')),
    [sessions]
  );

  const hour = new Date().getHours();
  const withinWorkHours = hour >= 7 && hour <= 22;

  if (active || dismissed || hasWorkedToday || !withinWorkHours || jobs.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[color:var(--color-warn)]/25 bg-[color:var(--color-warn)]/[0.07] px-4 py-3.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color:var(--color-warn)]/15 text-[color:var(--color-warn)]">
        <Clock size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[color:var(--color-ink)]">Vergeten te starten?</p>
        <p className="text-xs text-[color:var(--color-ink-muted)] mt-0.5">Je kunt je echte starttijd nog invoeren.</p>
      </div>
      <Button size="sm" variant="secondary" onClick={onFix}>
        Tijd aanpassen
      </Button>
      <button onClick={() => setDismissed(true)} className="text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)] mt-1">
        <X size={15} />
      </button>
    </div>
  );
}
