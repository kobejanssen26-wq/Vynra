import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Clock3, PenLine, Play } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import JobPicker from './JobPicker';
import { useStore } from '../store/useStore';
import { useUI } from '../store/useUI';
import { effectiveRate, formatCurrency, todayISO, addDays } from '../lib/calc';
import { visibleJobs } from '../lib/stats';

/** "Nieuwe sessie": start the clock in two taps, or log / plan time instead. */
export default function QuickStartModal() {
  const open = useUI((s) => s.quickStartOpen);
  const setOpen = useUI((s) => s.setQuickStart);
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Nieuwe sessie" subtitle="Kies je job en zet de klok aan." width={480}>
      <QuickStartForm onClose={() => setOpen(false)} />
    </Modal>
  );
}

function QuickStartForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const jobs = visibleJobs(useStore((s) => s.jobs));
  const symbol = useStore((s) => s.settings.currencySymbol);
  const startSession = useStore((s) => s.startSession);
  const { openSession, openForgot } = useUI();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const [rateId, setRateId] = useState<string | null>(null);
  const job = jobs.find((j) => j.id === jobId);

  if (jobs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[color:var(--color-ink-muted)]">Je hebt nog geen jobs. Maak er eerst één aan.</p>
        <Button
          onClick={() => {
            onClose();
            navigate('/jobs?nieuw=1');
          }}
        >
          Nieuwe job
        </Button>
      </div>
    );
  }

  const alt = [
    { icon: Clock3, label: 'Vergeten te starten?', action: () => openForgot() },
    { icon: PenLine, label: 'Handmatig toevoegen', action: () => openSession({ defaultDate: todayISO() }) },
    { icon: CalendarPlus, label: 'Werkdag plannen', action: () => openSession({ defaultDate: addDays(todayISO(), 1), defaultKind: 'planned' }) },
  ];

  return (
    <div className="space-y-5">
      <JobPicker jobId={jobId} rateId={rateId} onJobChange={setJobId} onRateChange={setRateId} />
      <Button
        size="lg"
        fullWidth
        className="h-14"
        icon={<Play size={20} fill="currentColor" />}
        onClick={() => {
          if (!job) return;
          startSession(job.id, rateId);
          onClose();
          navigate('/');
        }}
      >
        Start · {formatCurrency(effectiveRate(job, rateId), symbol)}/u
      </Button>
      <div className="grid grid-cols-3 gap-2">
        {alt.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            onClick={() => {
              onClose();
              action();
            }}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] px-2 py-3 text-center text-[11px] font-medium text-[color:var(--color-ink-muted)] transition-colors hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-ink)]"
          >
            <Icon size={16} className="text-[color:var(--color-neon)]" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
