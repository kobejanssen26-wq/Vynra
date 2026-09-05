import { useState } from 'react';
import { Briefcase, Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Job } from '../types';
import { formatCurrency } from '../lib/calc';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import JobModal from '../components/jobs/JobModal';

export default function Jobs() {
  const jobs = useStore((s) => s.jobs);
  const deleteJob = useStore((s) => s.deleteJob);
  const settings = useStore((s) => s.settings);

  const [modalOpen, setModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null);

  function openNew() {
    setEditJob(null);
    setModalOpen(true);
  }

  function openEdit(job: Job) {
    setEditJob(job);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lg:hidden text-2xl font-bold text-[color:var(--color-ink)]">Mijn jobs</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">Beheer je jobs, uurlonen en speciale tarieven.</p>
        </div>
        <div className="hidden sm:block">
          <Button icon={<Plus size={16} />} onClick={openNew}>
            Nieuwe job
          </Button>
        </div>
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
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="glass-card rounded-3xl p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl"
                    style={{ background: `${job.color}22` }}
                  >
                    {job.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-[color:var(--color-ink)]">{job.name}</p>
                    <p className="text-sm" style={{ color: job.color }}>
                      {formatCurrency(job.baseRate, settings.currencySymbol)} / uur
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(job)}
                    className="rounded-lg p-1.5 text-[color:var(--color-ink-faint)] hover:bg-white/[0.06] hover:text-[color:var(--color-ink)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(job)}
                    className="rounded-lg p-1.5 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-danger)]/15 hover:text-[color:var(--color-danger)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {job.rateRules.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.rateRules.map((rule) => (
                    <span
                      key={rule.id}
                      className="rounded-lg border border-[color:var(--color-border)] bg-white/[0.03] px-2.5 py-1 text-xs text-[color:var(--color-ink-muted)]"
                    >
                      {rule.label} <span className="text-[color:var(--color-neon)]">+{formatCurrency(rule.delta, settings.currencySymbol)}/u</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={openNew}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[color:var(--color-border-strong)] py-10 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-neon)]/40 transition-colors"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">Nieuwe job</span>
          </button>
        </div>
      )}

      <JobModal open={modalOpen} onClose={() => setModalOpen(false)} editJob={editJob} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Job verwijderen?" width={380}>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          "{confirmDelete?.name}" en alle bijbehorende sessies worden permanent verwijderd.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">
            Annuleren
          </Button>
          <Button
            variant="danger"
            className="flex-1"
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
