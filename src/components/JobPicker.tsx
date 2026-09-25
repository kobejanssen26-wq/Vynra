import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/calc';
import { visibleJobs } from '../lib/stats';

type Props = {
  jobId: string;
  rateId: string | null;
  onJobChange: (id: string) => void;
  onRateChange: (id: string | null) => void;
  compact?: boolean;
};

/** Tap-friendly job + rate chooser. The rate row only appears when the job has special rates. */
export default function JobPicker({ jobId, rateId, onJobChange, onRateChange, compact }: Props) {
  const jobs = visibleJobs(useStore((s) => s.jobs));
  const symbol = useStore((s) => s.settings.currencySymbol);
  const job = jobs.find((j) => j.id === jobId);

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="radiogroup" aria-label="Job">
        {jobs.map((j) => {
          const selected = j.id === jobId;
          return (
            <button
              key={j.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onJobChange(j.id);
                onRateChange(null);
              }}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl border text-left transition-all ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'} ${
                selected
                  ? 'border-[color:var(--color-neon)]/60 bg-[color:var(--color-neon)]/[0.08] shadow-[0_0_0_1px_rgba(57,255,176,0.12)]'
                  : 'border-[color:var(--color-border)] bg-[color:var(--color-fill)] hover:border-[color:var(--color-border-strong)]'
              }`}
            >
              <span className={compact ? 'text-base' : 'text-lg'}>{j.icon}</span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-[color:var(--color-ink)]">{j.name}</span>
                <span className="text-[11px] text-[color:var(--color-ink-muted)] tabular">{formatCurrency(j.baseRate, symbol)}/u</span>
              </span>
            </button>
          );
        })}
      </div>

      {job && job.rateRules.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tarief">
          {[{ id: null as string | null, label: 'Normaal', delta: 0 }, ...job.rateRules].map((r) => {
            const selected = r.id === rateId;
            return (
              <button
                key={r.id ?? 'base'}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onRateChange(r.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                  selected
                    ? 'border-[color:var(--color-neon)]/50 bg-[color:var(--color-neon)]/10 text-[color:var(--color-ink)]'
                    : 'border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-ink)]'
                }`}
              >
                {r.label}
                {r.delta !== 0 && <span className="ml-1 text-[color:var(--color-neon)]">{r.delta > 0 ? '+' : '−'}{formatCurrency(Math.abs(r.delta), symbol)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
