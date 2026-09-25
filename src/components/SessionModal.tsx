import { useState } from 'react';
import { ArrowRight, CalendarClock, Sparkles } from 'lucide-react';
import Modal from './ui/Modal';
import { FieldWrap, Select, TextInput } from './ui/Field';
import Button from './ui/Button';
import Segmented from './ui/Segmented';
import { useStore } from '../store/useStore';
import type { Session } from '../types';
import {
  applyRounding,
  effectiveRate,
  formatCurrency,
  formatDurationLong,
  grossDurationSeconds,
  hm,
  moneyFromSeconds,
  sessionDurationSeconds,
  sessionEarnings,
  sessionMinutes,
  todayISO,
} from '../lib/calc';
import { visibleJobs } from '../lib/stats';

type Props = {
  open: boolean;
  onClose: () => void;
  editSession?: Session | null;
  defaultDate?: string;
  defaultKind?: 'done' | 'planned';
  title?: string;
  subtitle?: string;
};

type Kind = 'done' | 'planned';

export default function SessionModal({ open, onClose, editSession, defaultDate, defaultKind, title, subtitle }: Props) {
  const jobs = useStore((s) => s.jobs);
  const hasJobs = visibleJobs(jobs).length > 0 || !!editSession;
  const planning = editSession ? editSession.kind === 'planned' : defaultKind === 'planned' || (defaultDate ?? todayISO()) > todayISO();

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={520}
      title={title ?? (editSession ? 'Sessie bewerken' : planning ? 'Werkdag plannen' : 'Handmatig een sessie toevoegen')}
      subtitle={
        subtitle ??
        (editSession
          ? 'Pas datum, tijden, pauze, job, tarief of notitie aan.'
          : planning
            ? 'Plan een toekomstige werkdag. Verwacht geld telt nooit mee als verdiend.'
            : 'Vergeten bij te houden? Vul je werkdag achteraf in.')
      }
    >
      {hasJobs ? (
        <SessionForm key={editSession?.id ?? 'new'} onClose={onClose} editSession={editSession ?? null} defaultDate={defaultDate} defaultKind={defaultKind} />
      ) : (
        <p className="text-sm text-[color:var(--color-ink-muted)]">Maak eerst een job aan bij "Mijn jobs" voordat je een sessie toevoegt.</p>
      )}
    </Modal>
  );
}

function SessionForm({
  onClose,
  editSession,
  defaultDate,
  defaultKind,
}: {
  onClose: () => void;
  editSession: Session | null;
  defaultDate?: string;
  defaultKind?: Kind;
}) {
  const allJobs = useStore((s) => s.jobs);
  const symbol = useStore((s) => s.settings.currencySymbol);
  const addSession = useStore((s) => s.addSession);
  const updateSession = useStore((s) => s.updateSession);
  const deleteSession = useStore((s) => s.deleteSession);

  const today = todayISO();
  const jobs = allJobs.filter((j) => !j.archived || j.id === editSession?.jobId);
  const e = editSession;
  const initialDate = e?.date ?? defaultDate ?? today;

  const [jobId, setJobId] = useState(e?.jobId ?? jobs[0]?.id ?? '');
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(e ? hm(e.startTime) : initialDate > today ? '13:00' : '09:00');
  const [endTime, setEndTime] = useState(e ? hm(e.endTime) : initialDate > today ? '18:00' : '17:00');
  const [breakMinutes, setBreakMinutes] = useState(e ? Math.round(e.breakMinutes) : 0);
  const [rateId, setRateId] = useState<string | null>(e?.rateId ?? null);
  const [note, setNote] = useState(e?.note ?? '');
  const [kindChoice, setKindChoice] = useState<Kind>(e ? (e.kind === 'planned' ? 'planned' : 'done') : (defaultKind ?? 'done'));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isFuture = date > today;
  const isPast = date < today;
  // The date decides what's possible: the future can only be planned, the past only worked.
  const kind: Kind = isFuture ? 'planned' : isPast ? 'done' : kindChoice;

  const job = jobs.find((j) => j.id === jobId);
  const jobOrRateChanged = !e || e.jobId !== jobId || e.rateId !== rateId;
  const rate = !jobOrRateChanged && e?.rate != null && kind === 'done' ? e.rate : effectiveRate(job, rateId);

  // Keep original seconds when the times weren't touched, so editing a note never shifts earnings.
  const timesUnchanged = !!e && hm(e.startTime) === startTime && hm(e.endTime) === endTime && Math.round(e.breakMinutes) === breakMinutes;
  const saveStart = timesUnchanged ? e!.startTime : startTime;
  const saveEnd = timesUnchanged ? e!.endTime : endTime;
  const saveBreak = timesUnchanged ? e!.breakMinutes : breakMinutes;

  const seconds = applyRounding(sessionDurationSeconds(saveStart, saveEnd, saveBreak));
  const amount = moneyFromSeconds(seconds, rate);
  const gross = grossDurationSeconds(saveStart, saveEnd);
  const effectiveHourly = gross > 0 ? amount / (gross / 3600) : 0;
  const valid = !!job && seconds > 0 && breakMinutes * 60 < gross;

  function handleSave() {
    if (!job || !valid) return;
    const planned = kind === 'planned';
    const payload = {
      jobId: job.id,
      rateId,
      rate: planned ? undefined : rate,
      date,
      startTime: saveStart,
      endTime: saveEnd,
      breakMinutes: saveBreak,
      note: note.trim() || undefined,
    };
    if (e) {
      const untouchedLive = e.kind === 'worked' && timesUnchanged && !jobOrRateChanged && e.date === date;
      updateSession(e.id, { ...payload, kind: planned ? 'planned' : untouchedLive ? 'worked' : 'manual' });
    } else {
      addSession({ ...payload, kind: planned ? 'planned' : 'manual' });
    }
    onClose();
  }

  return (
    <div className="space-y-4">
      {!isFuture && !isPast && (
        <Segmented<Kind>
          value={kind}
          onChange={setKindChoice}
          size="sm"
          options={[
            { value: 'done', label: 'Gewerkt' },
            { value: 'planned', label: 'Gepland' },
          ]}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <FieldWrap label="Datum">
          <TextInput type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
        </FieldWrap>
        <FieldWrap label="Job">
          <Select
            value={jobId}
            onChange={(ev) => {
              setJobId(ev.target.value);
              setRateId(null);
            }}
          >
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
          <TextInput type="time" value={startTime} onChange={(ev) => setStartTime(ev.target.value)} />
        </FieldWrap>
        <FieldWrap label="Eindtijd">
          <TextInput type="time" value={endTime} onChange={(ev) => setEndTime(ev.target.value)} />
        </FieldWrap>
        <FieldWrap label="Pauze (min)">
          <TextInput type="number" min={0} step={5} value={breakMinutes} onChange={(ev) => setBreakMinutes(Math.max(0, Number(ev.target.value) || 0))} />
        </FieldWrap>
      </div>

      <FieldWrap label="Tarief">
        <Select value={rateId ?? ''} onChange={(ev) => setRateId(ev.target.value || null)}>
          <option value="">Normaal — {formatCurrency(job?.baseRate ?? 0, symbol)}/u</option>
          {job?.rateRules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} — {formatCurrency((job?.baseRate ?? 0) + r.delta, symbol)}/u
            </option>
          ))}
        </Select>
      </FieldWrap>

      <FieldWrap label="Notitie (optioneel)">
        <TextInput value={note} onChange={(ev) => setNote(ev.target.value)} placeholder={kind === 'planned' ? 'Bijv. extra dienst' : 'Bijv. vergeten in te klokken'} />
      </FieldWrap>

      {kind === 'planned' && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[color:var(--color-info)]/25 bg-[color:var(--color-info)]/10 px-3.5 py-3 text-xs text-[color:var(--color-ink-muted)]">
          <CalendarClock size={15} className="mt-0.5 shrink-0 text-[color:var(--color-info)]" />
          <span>
            Dit wordt een <strong className="text-[color:var(--color-ink)]">geplande</strong> werkdag. Het bedrag is <strong className="text-[color:var(--color-ink)]">verwacht</strong> en telt pas als verdiend
            wanneer je de sessie echt werkt.
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-medium text-[color:var(--color-ink-muted)]">
          <Sparkles size={13} className="text-[color:var(--color-neon)]" />
          {e ? 'Nieuwe gegevens' : kind === 'planned' ? 'Verwacht' : 'Automatisch berekend'}
        </p>
        {e && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-[color:var(--color-ink-faint)] tabular">
            Was: {hm(e.startTime)} → {hm(e.endTime)} · {formatDurationLong(sessionMinutes(e))} · {formatCurrency(sessionEarnings(e, allJobs.find((j) => j.id === e.jobId)), symbol)}
          </p>
        )}
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-0.5">
            <p className="num flex items-center gap-1.5 text-sm text-[color:var(--color-ink)]">
              {startTime || '--:--'} <ArrowRight size={13} className="text-[color:var(--color-ink-faint)]" /> {endTime || '--:--'}
            </p>
            <p className="text-sm text-[color:var(--color-ink-muted)]">
              <span className="num font-semibold text-[color:var(--color-ink)]">{formatDurationLong(seconds / 60)}</span> {kind === 'planned' ? 'gepland' : 'gewerkt'}
            </p>
          </div>
          <div className="text-right">
            <p className={`num text-3xl font-bold ${kind === 'planned' ? 'text-[color:var(--color-info)]' : 'text-[color:var(--color-neon)]'}`}>{formatCurrency(amount, symbol)}</p>
            <p className="text-[11px] text-[color:var(--color-ink-faint)] tabular">
              {kind === 'planned' ? 'verwacht' : 'bruto verdiend'} · effectief {formatCurrency(effectiveHourly, symbol)}/u
            </p>
          </div>
        </div>
        {!valid && job && <p className="mt-3 text-xs text-[color:var(--color-danger)]">Controleer je tijden: de gewerkte tijd moet langer zijn dan de pauze.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {e &&
          (confirmDelete ? (
            <Button
              variant="danger"
              onClick={() => {
                deleteSession(e.id);
                onClose();
              }}
            >
              Zeker verwijderen?
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="!text-[color:var(--color-danger)]">
              Verwijderen
            </Button>
          ))}
        <Button variant="secondary" onClick={onClose} className="ml-auto">
          Annuleren
        </Button>
        <Button onClick={handleSave} disabled={!valid}>
          {kind === 'planned' ? 'Inplannen' : 'Opslaan'}
        </Button>
      </div>
    </div>
  );
}
