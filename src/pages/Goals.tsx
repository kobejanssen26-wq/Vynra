import { useMemo, useState } from 'react';
import { Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Goal } from '../types';
import { effectiveRate, formatCurrency, formatDurationLong } from '../lib/calc';
import { averageHourlyValue, workedSessions } from '../lib/stats';
import { useTicker } from '../lib/useTicker';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import GoalModal from '../components/goals/GoalModal';

export default function Goals() {
  const goals = useStore((s) => s.goals);
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);

  useTicker(!!active && !active.isPaused, 3000);

  const referenceRate = useMemo(() => {
    const avg = averageHourlyValue(workedSessions(sessions), jobs);
    if (avg > 0) return avg;
    return jobs[0]?.baseRate ?? settings.defaultRate;
  }, [sessions, jobs, settings.defaultRate]);

  const activeJob = active ? jobs.find((j) => j.id === active.jobId) : undefined;
  const liveRate = active ? effectiveRate(activeJob, active.rateId) : null;
  const liveElapsedHours = active
    ? (active.accumulatedMs / 1000 + (active.isPaused ? 0 : (Date.now() - active.segmentStart) / 1000)) / 3600
    : 0;

  function openNew() {
    setEditGoal(null);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditGoal(goal);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lg:hidden text-2xl font-bold text-[color:var(--color-ink)]">Spaardoelen</h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">Vertaal je werk direct naar wat je ermee kunt bereiken.</p>
        </div>
        <div className="hidden sm:block">
          <Button icon={<Plus size={16} />} onClick={openNew}>
            Nieuw doel
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="Waar werk je naartoe?"
          description="Maak een spaardoel aan en zie live hoeveel werkuren je er nog vandaan bent."
          action={
            <Button icon={<Plus size={16} />} onClick={openNew}>
              Nieuw doel
            </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const totalHours = referenceRate > 0 ? goal.targetAmount / referenceRate : 0;
            let remainingHours = referenceRate > 0 ? remaining / referenceRate : 0;

            const isActiveGoalTarget = !!active && liveRate;
            if (isActiveGoalTarget && liveRate) {
              const projectedRemaining = Math.max(0, remaining - liveElapsedHours * liveRate);
              remainingHours = projectedRemaining / liveRate;
            }

            return (
              <div key={goal.id} className="glass-card rounded-3xl p-5 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-xl">{goal.icon}</div>
                    <div>
                      <p className="font-semibold text-[color:var(--color-ink)]">{goal.name}</p>
                      <p className="text-xs text-[color:var(--color-ink-faint)]">
                        {formatCurrency(goal.currentAmount, settings.currencySymbol)} / {formatCurrency(goal.targetAmount, settings.currencySymbol)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(goal)} className="rounded-lg p-1.5 text-[color:var(--color-ink-faint)] hover:bg-white/[0.06] hover:text-[color:var(--color-ink)]">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete(goal)} className="rounded-lg p-1.5 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-danger)]/15 hover:text-[color:var(--color-danger)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <ProgressBar value={progress} />
                <p className="mt-2 text-right text-xs font-semibold text-[color:var(--color-neon)]">{progress.toFixed(0)}%</p>

                <div className="mt-3 rounded-2xl border border-[color:var(--color-border)] bg-white/[0.02] p-3.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-ink-faint)] mb-1">Money Journey</p>
                  <p className="text-xs text-[color:var(--color-ink-muted)]">
                    {formatDurationLong(totalHours * 60)} → {formatCurrency(goal.targetAmount, settings.currencySymbol)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[color:var(--color-ink)]">
                    Nog {formatDurationLong(Math.max(0, remainingHours) * 60)} tot je {goal.name.toLowerCase()}.
                  </p>
                </div>

                {goal.allocationPercent ? (
                  <p className="mt-3 text-[11px] text-[color:var(--color-ink-faint)]">
                    {goal.allocationPercent}% van elke sessie wordt automatisch toegevoegd.
                  </p>
                ) : null}
              </div>
            );
          })}

          <button
            onClick={openNew}
            className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[color:var(--color-border-strong)] py-10 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-neon)]/40 transition-colors"
          >
            <Plus size={20} />
            <span className="text-sm font-medium">Nieuw doel</span>
          </button>
        </div>
      )}

      <GoalModal open={modalOpen} onClose={() => setModalOpen(false)} editGoal={editGoal} />

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Doel verwijderen?" width={380}>
        <p className="text-sm text-[color:var(--color-ink-muted)]">"{confirmDelete?.name}" wordt permanent verwijderd.</p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)} className="flex-1">
            Annuleren
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (confirmDelete) deleteGoal(confirmDelete.id);
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
