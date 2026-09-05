import { useEffect, useMemo, useState } from 'react';
import { Sparkles, TriangleAlert } from 'lucide-react';
import Modal from './ui/Modal';
import { FieldWrap, Select, TextInput } from './ui/Field';
import Button from './ui/Button';
import { useStore } from '../store/useStore';
import type { Session } from '../types';
import {
  effectiveRate,
  formatCurrency,
  formatDurationLong,
  moneyFromMinutes,
  sessionDurationMinutes,
  todayISO,
} from '../lib/calc';

type Prefill = {
  jobId?: string;
  startTime?: string;
  endTime?: string;
  rateId?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  editSession?: Session | null;
  defaultDate?: string;
  prefill?: Prefill;
  title?: string;
  subtitle?: string;
};

export default function SessionModal({ open, onClose, editSession, defaultDate, prefill, title, subtitle }: Props) {
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);
  const addManualSession = useStore((s) => s.addManualSession);
  const updateSession = useStore((s) => s.updateSession);
  const deleteSession = useStore((s) => s.deleteSession);

  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate ?? todayISO());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [rateId, setRateId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editSession) {
      setJobId(editSession.jobId);
      setDate(editSession.date);
      setStartTime(editSession.startTime);
      setEndTime(editSession.endTime);
      setBreakMinutes(editSession.breakMinutes);
      setRateId(editSession.rateId);
      setNote(editSession.note ?? '');
    } else {
      setJobId(prefill?.jobId ?? jobs[0]?.id ?? '');
      setDate(defaultDate ?? todayISO());
      setStartTime(prefill?.startTime ?? '09:00');
      setEndTime(prefill?.endTime ?? '17:00');
      setBreakMinutes(0);
      setRateId(prefill?.rateId ?? null);
      setNote('');
    }
  }, [open, editSession, defaultDate, jobs, prefill]);

  const job = jobs.find((j) => j.id === jobId);
  const isFuture = date > todayISO();

  const preview = useMemo(() => {
    const minutes = sessionDurationMinutes(startTime, endTime, breakMinutes);
    const rate = effectiveRate(job, rateId);
    const amount = moneyFromMinutes(minutes, rate);
    return { minutes, rate, amount };
  }, [startTime, endTime, breakMinutes, job, rateId]);

  if (!jobs.length) {
    return (
      <Modal open={open} onClose={onClose} title="Eerst een job nodig">
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          Maak eerst een job aan bij "Mijn jobs" voordat je een sessie kunt toevoegen.
        </p>
      </Modal>
    );
  }

  function handleSave() {
    if (!job) return;
    const kind: Session['kind'] = isFuture ? 'planned' : 'manual';
    const payload = {
      jobId: job.id,
      rateId,
      date,
      startTime,
      endTime,
      breakMinutes,
      note: note.trim() || undefined,
      kind,
    };
    if (editSession) {
      updateSession(editSession.id, {
        ...payload,
        kind: editSession.kind === 'worked' && !isFuture ? 'manual' : kind,
      });
    } else {
      addManualSession(payload);
    }
    onClose();
  }

  function handleDelete() {
    if (editSession) {
      deleteSession(editSession.id);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? (editSession ? 'Sessie bewerken' : 'Handmatig een sessie toevoegen')}
      subtitle={subtitle ?? (editSession ? 'Pas datum, tijd, job of tarief aan.' : 'Vergeten te klokken of een dag vooruit plannen? Vul het hier in.')}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Datum">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Job">
            <Select value={jobId} onChange={(e) => { setJobId(e.target.value); setRateId(null); }}>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.icon} {j.name}
                </option>
              ))}
            </Select>
          </FieldWrap>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FieldWrap label="Begintijd">
            <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Eindtijd">
            <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Pauze (min)">
            <TextInput
              type="number"
              min={0}
              step={5}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(Math.max(0, Number(e.target.value)))}
            />
          </FieldWrap>
        </div>

        <FieldWrap label="Tarief">
          <Select value={rateId ?? ''} onChange={(e) => setRateId(e.target.value || null)}>
            <option value="">Normaal — {formatCurrency(job?.baseRate ?? 0, settings.currencySymbol)}/u</option>
            {job?.rateRules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} — {formatCurrency((job?.baseRate ?? 0) + r.delta, settings.currencySymbol)}/u
              </option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Notitie (optioneel)">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijv. vergeten in te klokken" />
        </FieldWrap>

        {isFuture && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-[color:var(--color-info)]/25 bg-[color:var(--color-info)]/10 px-3.5 py-3 text-xs text-[color:var(--color-info)]">
            <TriangleAlert size={15} className="mt-0.5 shrink-0" />
            <span>Deze datum ligt in de toekomst — dit wordt opgeslagen als een <strong>geplande</strong> werkdag met verwachte inkomsten, niet als daadwerkelijk verdiend.</span>
          </div>
        )}

        <div className="rounded-2xl glass-card p-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-medium text-[color:var(--color-ink-muted)]">
            <Sparkles size={13} className="text-[color:var(--color-neon)]" />
            {isFuture ? 'Verwacht' : 'Nieuwe gegevens'}
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-[color:var(--color-ink-muted)]">
                {startTime} → {endTime}
              </p>
              <p className="text-sm font-medium text-[color:var(--color-ink)]">{formatDurationLong(preview.minutes)}</p>
            </div>
            <p className="text-2xl font-bold tabular text-[color:var(--color-neon)]" style={{ fontFamily: 'var(--font-display)' }}>
              {formatCurrency(preview.amount, settings.currencySymbol)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {editSession && (
            <Button variant="danger" onClick={handleDelete}>
              Verwijderen
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Annuleren
          </Button>
          <Button onClick={handleSave}>Opslaan</Button>
        </div>
      </div>
    </Modal>
  );
}
