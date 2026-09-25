import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Job } from '../types';
import { formatCurrency, formatDurationLong } from '../lib/calc';
import { currentMonthRange, filterByRange, totalEarnings, totalMinutes, visibleJobs, workedSessions } from '../lib/stats';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import JobModal from '../components/jobs/JobModal';

export default function Jobs() {
  const allJobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const deleteJob = useStore((s) => s.deleteJob);
  const startSession = useStore((s) => s.startSession);
  const sym = useStore((s) => s.settings.currencySymbol);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const jobs = visibleJobs(allJobs);
  const [modalOpen, setModalOpen] = useState(() => params.get('nieuw') === '1');
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null);

  const month = currentMonthRange();
  const monthWorked = filterByRange(workedSessions(sessions), month.from, month.to);

  function openNew() {
    setEditJob(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    if (params.has('nieuw')) setParams({}, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:hidden" style={{ fontFamily: 'var(--font-display)' }}>
            Mijn jobs
          </h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">Je jobs, uurlonen en speciale tarieven.</p>
        </div>
        {jobs.length > 0 && (
          <Button icon={<Plus size={16} />} onClick={openNew}>
            Nieuwe job
          </Button>
        )}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={22} />}
          title="Je hebt nog geen jobs."
          description="Maak je eerste job aan en begin je tijd om te zetten in inkomsten."
          action={
            <Button icon={<Plus size={16} />} onClick={openNew}>
              Nieuwe job
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const js = monthWorked.filter((s) => s.jobId === job.id);
            const running = active?.jobId === job.id;
            return (
              <div key={job.id} className="glass-card flex flex-col rounded-3xl p-5 transition-colors hover:border-[color:var(--color-border-strong)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ background: `${job.color}26` }}>
                      {job.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[color:var(--color-ink)]">{job.name}</p>
                      <p className="num text-sm text-[color:var(--color-ink-muted)]">{formatCurrency(job.baseRate, sym)} / uur</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button onClick={() => { setEditJob(job); setModalOpen(true); }} aria-label={`${job.name} bewerken`} className="rounded-lg p-2 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-fill-hover)] hover:text-[color:var(--color-ink)]">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setConfirmDelete(job)} aria-label={`${job.name} verwijderen`} className="rounded-lg p-2 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-danger)]/15 hover:text-[color:var(--color-danger)]">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between rounded-xl bg-[color:var(--color-fill)] px-3 py-2 text-xs">
                    <span className="text-[color:var(--color-ink-muted)]">Normaal</span>
                    <span className="num font-medium text-[color:var(--color-ink)]">{formatCurrency(job.baseRate, sym)}/u</span>
                  </div>
                  {job.rateRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between rounded-xl bg-[color:var(--color-fill)] px-3 py-2 text-xs">
                      <span className="text-[color:var(--color-ink-muted)]">{rule.label}</span>
                      <span className="num text-[color:var(--color-ink)]">
                        <span className="text-[color:var(--color-neon)]">
                          {rule.delta >= 0 ? '+' : '−'}
                          {formatCurrency(Math.abs(rule.delta), sym)}/u
                        </span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <div className="text-xs text-[color:var(--color-ink-faint)]">
                    Deze maand
                    <p className="num mt-0.5 text-sm font-semibold text-[color:var(--color-ink)]">
                      {formatCurrency(totalEarnings(js, allJobs), sym)} <span className="font-normal text-[color:var(--color-ink-muted)]">· {formatDurationLong(totalMinutes(js))}</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={running ? 'secondary' : 'primary'}
                    icon={<Play size={13} fill="currentColor" />}
                    disabled={!!active && !running}
                    onClick={() => {
                      if (!running) startSession(job.id, null);
                      navigate('/');
                    }}
                  >
                    {running ? 'Loopt' : 'Start'}
                  </Button>
                </div>
              </div>
            );
          })}

          <button
            onClick={openNew}
            className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[color:var(--color-border-strong)] text-[color:var(--color-ink-muted)] transition-colors hover:border-[color:var(--color-neon)]/40 hover:text-[color:var(--color-ink)]"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">Nieuwe job</span>
          </button>
        </div>
      )}

      <JobModal open={modalOpen} onClose={closeModal} editJob={editJob} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Job verwijderen?" width={400}>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          "{confirmDelete?.name}" verdwijnt uit je jobs en geplande diensten. Je gewerkte uren en verdiensten blijven bewaard in je geschiedenis en statistieken.
        </p>
        {active?.jobId === confirmDelete?.id && <p className="mt-3 text-xs text-[color:var(--color-warn)]">Stop eerst de lopende sessie van deze job.</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">
            Annuleren
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={active?.jobId === confirmDelete?.id}
            onClick={() => {
              if (confirmDelete) deleteJob(confirmDelete.id);
              setConfirmDelete(null);
            }}
          >
            Verwijderen
          </Button>
        </div>
      </Modal>
    </div>
  );
}
