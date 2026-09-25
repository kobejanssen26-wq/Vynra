import { ChevronRight } from 'lucide-react';
import type { Job, Session } from '../types';
import { KIND_META } from '../lib/kinds';
import { formatCurrency, formatDurationLong, hm, sessionEarnings, sessionMinutes } from '../lib/calc';


type Props = {
  session: Session;
  job: Job | undefined;
  symbol: string;
  onClick?: () => void;
  dense?: boolean;
};

export default function SessionRow({ session, job, symbol, onClick, dense }: Props) {
  const planned = session.kind === 'planned';
  const meta = KIND_META[session.kind];
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3.5 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] text-left transition-all hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-fill-hover)] ${dense ? 'px-3.5 py-3' : 'px-4 py-3.5'} ${planned ? 'border-dashed' : ''}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${job?.color ?? '#888'}22` }}>
        {job?.icon ?? '•'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-[color:var(--color-ink)]">{job?.name ?? 'Onbekende job'}</p>
          {session.kind !== 'worked' && (
            <span className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--color-ink-muted)]" style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[color:var(--color-ink-muted)] tabular">
          {hm(session.startTime)} – {hm(session.endTime)} · {formatDurationLong(sessionMinutes(session))}
          {session.note && <span className="text-[color:var(--color-ink-faint)]"> · {session.note}</span>}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`num text-sm font-semibold ${planned ? 'text-[color:var(--color-info)]' : 'text-[color:var(--color-ink)]'}`}>
          {formatCurrency(sessionEarnings(session, job), symbol)}
        </p>
        <p className="text-[10px] text-[color:var(--color-ink-faint)]">{planned ? 'verwacht' : 'verdiend'}</p>
      </div>
      {onClick && <ChevronRight size={15} className="shrink-0 text-[color:var(--color-ink-faint)] transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
}
