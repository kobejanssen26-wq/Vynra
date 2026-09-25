import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FieldWrap, TextInput } from '../ui/Field';
import { useStore } from '../../store/useStore';
import { effectiveRate, formatCurrency, formatHMS, moneyFromSeconds, resolveStartMs, timeOf } from '../../lib/calc';
import { activeWorkedSeconds } from '../../lib/stats';

type Props = { open: boolean; onClose: () => void };

/** Corrects the start of the running session, e.g. when Start was pressed too late. */
export default function AdjustStartModal({ open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Starttijd aanpassen" subtitle="Te laat op Start gedrukt? Zet de klok terug naar je echte begintijd." width={400}>
      <AdjustForm onClose={onClose} />
    </Modal>
  );
}

function AdjustForm({ onClose }: { onClose: () => void }) {
  const active = useStore((s) => s.active);
  const jobs = useStore((s) => s.jobs);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const adjust = useStore((s) => s.adjustActiveStart);
  const [time, setTime] = useState(() => (active ? timeOf(new Date(active.sessionStart)) : ''));
  const [now] = useState(() => Date.now());

  if (!active) return null;
  const rate = effectiveRate(jobs.find((j) => j.id === active.jobId), active.rateId);
  const startMs = resolveStartMs(time, now);
  const delta = (active.sessionStart - startMs) / 1000;
  const worked = Math.max(0, activeWorkedSeconds(active, now) + delta);

  return (
    <div className="space-y-4">
      <FieldWrap label="Begonnen om">
        <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} className="num !text-lg" />
      </FieldWrap>
      <div className="flex items-end justify-between rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] p-4">
        <div>
          <p className="text-xs text-[color:var(--color-ink-muted)]">Gewerkt</p>
          <p className="num text-xl font-semibold text-[color:var(--color-ink)]">{formatHMS(worked)}</p>
        </div>
        <p className="num text-2xl font-bold text-[color:var(--color-neon)]">{formatCurrency(moneyFromSeconds(worked, rate), symbol)}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuleren
        </Button>
        <Button
          disabled={!time}
          onClick={() => {
            adjust(startMs);
            onClose();
          }}
        >
          Toepassen
        </Button>
      </div>
    </div>
  );
}
