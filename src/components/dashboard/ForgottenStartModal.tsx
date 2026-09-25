import { useState } from 'react';
import { Play, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Segmented from '../ui/Segmented';
import { FieldWrap, TextInput } from '../ui/Field';
import JobPicker from '../JobPicker';
import { useStore } from '../../store/useStore';
import { useTicker } from '../../lib/useTicker';
import {
  effectiveRate,
  formatCurrency,
  formatDurationLong,
  formatHMS,
  moneyFromSeconds,
  pad2,
  resolveStartMs,
  sessionDurationSeconds,
  timeOf,
  todayISO,
} from '../../lib/calc';
import { visibleJobs } from '../../lib/stats';

import type { ForgotPrefill } from './ForgottenStartBanner';

type Props = { open: boolean; onClose: () => void; prefill?: ForgotPrefill };

type Mode = 'running' | 'stopped';

export default function ForgottenStartModal({ open, onClose, prefill }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Vergeten te starten?" subtitle="Je kunt je echte starttijd nog invoeren." width={500}>
      <ForgottenForm onClose={onClose} prefill={prefill} />
    </Modal>
  );
}

function guessStart(): string {
  // 30 minutes ago, snapped down to a quarter hour.
  const d = new Date(Date.now() - 30 * 60 * 1000);
  return `${pad2(d.getHours())}:${pad2(Math.floor(d.getMinutes() / 15) * 15)}`;
}

function ForgottenForm({ onClose, prefill }: { onClose: () => void; prefill?: ForgotPrefill }) {
  const jobs = visibleJobs(useStore((s) => s.jobs));
  const symbol = useStore((s) => s.settings.currencySymbol);
  const startSession = useStore((s) => s.startSession);
  const addSession = useStore((s) => s.addSession);

  const [mode, setMode] = useState<Mode>('running');
  const [jobId, setJobId] = useState(prefill?.jobId ?? jobs[0]?.id ?? '');
  const [rateId, setRateId] = useState<string | null>(prefill?.rateId ?? null);
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState(() => prefill?.start ?? guessStart());
  const [end, setEnd] = useState(() => timeOf(new Date()));
  const [pause, setPause] = useState(0);
  const now = useTicker(mode === 'running');

  const job = jobs.find((j) => j.id === jobId);
  const rate = effectiveRate(job, rateId);

  const startMs = resolveStartMs(start, now);
  const seconds = mode === 'running' ? Math.max(0, (now - startMs) / 1000) : sessionDurationSeconds(start, end, pause);
  const amount = moneyFromSeconds(seconds, rate);
  const valid = !!job && !!start && (mode === 'running' || (!!end && seconds > 0));

  function submit() {
    if (!job) return;
    if (mode === 'running') {
      startSession(job.id, rateId, startMs);
    } else {
      addSession({
        jobId: job.id,
        rateId,
        rate,
        date,
        startTime: start,
        endTime: end,
        breakMinutes: pause,
        kind: 'manual',
        note: 'Starttijd achteraf ingevoerd',
      });
    }
    onClose();
  }

  return (
    <div className="space-y-5">
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'running', label: 'Ik werk nog' },
          { value: 'stopped', label: 'Ik ben al gestopt' },
        ]}
      />

      <JobPicker jobId={jobId} rateId={rateId} onJobChange={setJobId} onRateChange={setRateId} compact />

      {mode === 'running' ? (
        <FieldWrap label="Begonnen om" hint="De timer loopt verder vanaf dit moment.">
          <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} className="num !text-lg" />
        </FieldWrap>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-4">
            <FieldWrap label="Datum">
              <TextInput type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </FieldWrap>
          </div>
          <FieldWrap label="Begonnen om">
            <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Gestopt om">
            <TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </FieldWrap>
          <div className="col-span-2">
            <FieldWrap label="Pauze (min)">
              <TextInput type="number" min={0} step={5} value={pause} onChange={(e) => setPause(Math.max(0, Number(e.target.value) || 0))} />
            </FieldWrap>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[color:var(--color-neon)]/20 bg-[color:var(--color-neon)]/[0.05] p-4">
        <p className="text-xs text-[color:var(--color-ink-muted)]">
          {mode === 'running' ? 'Al gewerkt sinds' : 'VYNRA berekent'} {mode === 'running' && <span className="num">{start}</span>}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="num text-xl font-semibold text-[color:var(--color-ink)]">
            {mode === 'running' ? formatHMS(seconds) : formatDurationLong(seconds / 60)}
          </p>
          <p className="num text-3xl font-bold text-[color:var(--color-neon)]">{formatCurrency(amount, symbol)}</p>
        </div>
        <p className="mt-1 text-[11px] text-[color:var(--color-ink-faint)] tabular">
          {formatCurrency(rate, symbol)}/u · in plaats van alleen de tijd vanaf nu
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Annuleren
        </Button>
        <Button disabled={!valid} onClick={submit} icon={mode === 'running' ? <Play size={16} fill="currentColor" /> : <Check size={16} />}>
          {mode === 'running' ? `Timer starten vanaf ${start}` : 'Sessie opslaan'}
        </Button>
      </div>
    </div>
  );
}
