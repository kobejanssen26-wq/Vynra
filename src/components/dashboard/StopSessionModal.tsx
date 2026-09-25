import { useState } from 'react';
import { Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FieldWrap, TextInput } from '../ui/Field';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import { effectiveRate, formatCurrency, formatHMS, moneyFromSeconds, rateLabel, timeOf } from '../../lib/calc';
import { activeWorkedSeconds } from '../../lib/stats';
import type { Session } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (session: Session) => void;
};

export default function StopSessionModal({ open, onClose, onSaved }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Sessie stoppen?" subtitle="Controleer je sessie voordat je die opslaat." width={440}>
      <StopForm onClose={onClose} onSaved={onSaved} />
    </Modal>
  );
}

function StopForm({ onClose, onSaved }: Omit<Props, 'open'>) {
  const active = useStore((s) => s.active);
  const jobs = useStore((s) => s.jobs);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const stopSession = useStore((s) => s.stopSession);
  const discard = useStore((s) => s.discardActiveSession);
  const [note, setNote] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const now = useTicker(!!active);

  if (!active) return null;
  const job = jobs.find((j) => j.id === active.jobId);
  const rate = effectiveRate(job, active.rateId);
  const worked = activeWorkedSeconds(active, now);
  const pauseSeconds = Math.max(0, (now - active.sessionStart) / 1000 - worked);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] p-4">
        <div className="flex items-center gap-2 text-sm text-[color:var(--color-ink-muted)]">
          <span className="text-lg">{job?.icon}</span>
          <span className="font-medium text-[color:var(--color-ink)]">{job?.name}</span>
          <span>· {rateLabel(job, active.rateId)} · {formatCurrency(rate, symbol)}/u</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="num text-2xl font-semibold text-[color:var(--color-ink)]">{formatHMS(worked)}</p>
            <p className="text-xs text-[color:var(--color-ink-muted)]">
              {timeOf(new Date(active.sessionStart))} → {timeOf(new Date(now))}
              {pauseSeconds >= 60 && ` · ${Math.round(pauseSeconds / 60)} min pauze`}
            </p>
          </div>
          <p className="num text-3xl font-bold text-[color:var(--color-neon)]">{formatCurrency(moneyFromSeconds(worked, rate), symbol)}</p>
        </div>
      </div>

      <FieldWrap label="Notitie (optioneel)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. drukke zaterdag" />
      </FieldWrap>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onClose} size="lg">
          Verder werken
        </Button>
        <Button
          size="lg"
          icon={<Check size={18} />}
          onClick={() => {
            const saved = stopSession(note);
            if (saved) onSaved(saved);
          }}
        >
          Opslaan
        </Button>
      </div>

      <div className="text-center">
        {confirmDiscard ? (
          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Deze sessie wordt niet bewaard.{' '}
            <button
              className="font-semibold text-[color:var(--color-danger)] hover:underline"
              onClick={() => {
                discard();
                onClose();
              }}
            >
              Ja, verwerpen
            </button>
          </p>
        ) : (
          <button onClick={() => setConfirmDiscard(true)} className="text-xs text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-danger)]">
            Sessie verwerpen
          </button>
        )}
      </div>
    </div>
  );
}
