import { useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Pencil, Plus, PlusCircle, Target, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Goal } from '../types';
import { effectiveRate, formatCurrency, formatCurrencyShort, formatDurationLong, lowerFirst, parseAmount, roundCents } from '../lib/calc';
import { activeWorkedSeconds, averageHourlyValue, goalJourney, journeyGoal, workedSessions } from '../lib/stats';
import { useTicker } from '../lib/useTicker';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import GoalModal from '../components/goals/GoalModal';
import { FieldWrap, TextInput } from '../components/ui/Field';

export default function Goals() {
  const goals = useStore((s) => s.goals);
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const sym = settings.currencySymbol;

  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Goal | null>(null);
  const [deposit, setDeposit] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const now = useTicker(!!active && !active.isPaused);

  const avgRate = averageHourlyValue(workedSessions(sessions), jobs) || jobs.find((j) => !j.archived)?.baseRate || settings.defaultRate;
  const liveRate = active ? effectiveRate(jobs.find((j) => j.id === active.jobId), active.rateId) : 0;
  const rate = liveRate || avgRate;
  const liveEarned = active ? (activeWorkedSeconds(active, now) / 3600) * liveRate : 0;
  const hero = journeyGoal(goals);
  const heroJ = hero ? goalJourney(hero, rate, liveEarned) : null;
  const allocated = goals.reduce((sum, g) => sum + (g.allocationPercent ?? 0), 0);

  function openNew() {
    setEditGoal(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:hidden" style={{ fontFamily: 'var(--font-display)' }}>
            Spaardoelen
          </h1>
          <p className="text-sm text-[color:var(--color-ink-muted)]">Zie je doelen in werkuren — en zie ze groeien terwijl je werkt.</p>
        </div>
        {goals.length > 0 && (
          <Button icon={<Plus size={16} />} onClick={openNew}>
            Nieuw doel
          </Button>
        )}
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target size={22} />}
          title="Waar werk je naartoe?"
          description="Maak een spaardoel aan en zie hoeveel werkuren je er nog vandaan bent."
          action={
            <Button icon={<Plus size={16} />} onClick={openNew}>
              Nieuw doel
            </Button>
          }
        />
      ) : (
        <>
          {hero && heroJ && (
            <section className="relative overflow-hidden rounded-[28px] glass-card p-6 sm:p-8">
              <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, var(--color-teal), transparent 70%)' }} />
              <div className="relative grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">
                    <Compass size={14} className="text-[color:var(--color-neon)]" /> Money Journey
                    {active && heroJ.share > 0 && !active.isPaused && <span className="rounded-full bg-[color:var(--color-neon)]/10 px-2 py-0.5 text-[10px] normal-case tracking-normal text-[color:var(--color-neon)]">live</span>}
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-lg font-semibold text-[color:var(--color-ink)]">
                    <span className="text-2xl">{hero.icon}</span> {hero.name}
                  </p>
                  <p className="num mt-4 flex flex-wrap items-baseline gap-x-3 text-[2.4rem] font-bold leading-tight tracking-tight text-[color:var(--color-ink)] sm:text-5xl">
                    <span>{formatDurationLong(heroJ.totalHours * 60).replace(' 00m', '')}</span>
                    <span className="text-[color:var(--color-neon)]">→</span>
                    <span>{formatCurrencyShort(hero.targetAmount, sym)}</span>
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
                    Bij {formatCurrency(rate, sym)}/u{liveRate ? ' (huidige sessie)' : ' (jouw gemiddelde)'}
                    {heroJ.share > 0 && ` · ${Math.round(heroJ.share * 100)}% van elke sessie gaat naar dit doel`}
                  </p>
                </div>
                <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-fill)] p-5">
                  {heroJ.remaining <= 0 ? (
                    <p className="text-lg font-semibold text-[color:var(--color-neon)]">Doel bereikt. Tijd voor je {lowerFirst(hero.name)}.</p>
                  ) : (
                    <>
                      <p className="text-sm text-[color:var(--color-ink-muted)]">Nog</p>
                      <motion.p key={Math.floor(heroJ.remainingHours * 60)} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="num text-3xl font-bold text-[color:var(--color-neon)]">
                        {formatDurationLong(heroJ.remainingHours * 60)}
                      </motion.p>
                      <p className="text-sm text-[color:var(--color-ink-muted)]">tot je {lowerFirst(hero.name)}.</p>
                    </>
                  )}
                  <div className="mt-4">
                    <ProgressBar value={heroJ.progress} height={10} animateOnMount={false} />
                  </div>
                  <p className="mt-2 flex justify-between text-xs text-[color:var(--color-ink-muted)] tabular">
                    <span>
                      {formatCurrency(heroJ.saved, sym)} / {formatCurrency(hero.targetAmount, sym)}
                    </span>
                    <span className="font-semibold text-[color:var(--color-ink)]">{heroJ.progress.toFixed(0)}%</span>
                  </p>
                  {heroJ.share === 0 && <p className="mt-3 text-[11px] text-[color:var(--color-ink-faint)]">Tip: wijs een percentage toe, dan groeit dit doel automatisch mee met elke sessie.</p>}
                </div>
              </div>
            </section>
          )}

          <p className="text-xs text-[color:var(--color-ink-muted)]">
            Je wijst <span className="num font-semibold text-[color:var(--color-ink)]">{allocated}%</span> van je inkomsten automatisch toe aan doelen.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {goals.map((goal) => {
              const j = goalJourney(goal, rate, liveEarned);
              return (
                <div key={goal.id} className="glass-card flex flex-col rounded-3xl p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--color-fill-hover)] text-xl">{goal.icon}</div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[color:var(--color-ink)]">{goal.name}</p>
                        <p className="num text-xs text-[color:var(--color-ink-muted)]">
                          {formatCurrency(j.saved, sym)} / {formatCurrency(goal.targetAmount, sym)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button onClick={() => { setEditGoal(goal); setModalOpen(true); }} aria-label="Bewerken" className="rounded-lg p-2 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-fill-hover)] hover:text-[color:var(--color-ink)]">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(goal)} aria-label="Verwijderen" className="rounded-lg p-2 text-[color:var(--color-ink-faint)] hover:bg-[color:var(--color-danger)]/15 hover:text-[color:var(--color-danger)]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <ProgressBar value={j.progress} animateOnMount />
                    </div>
                    <span className="num w-10 text-right text-sm font-semibold text-[color:var(--color-ink)]">{j.progress.toFixed(0)}%</span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-[color:var(--color-fill)] px-3.5 py-3">
                    <p className="num text-xs text-[color:var(--color-ink-muted)]">
                      {formatDurationLong(j.totalHours * 60)} werk → {formatCurrency(goal.targetAmount, sym)}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--color-ink)]">
                      {j.remaining <= 0 ? 'Doel bereikt.' : <>Nog <span className="num font-semibold">{formatDurationLong(j.remainingHours * 60)}</span> tot je {lowerFirst(goal.name)}.</>}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-[11px] text-[color:var(--color-ink-faint)]">{goal.allocationPercent ? `${goal.allocationPercent}% van elke sessie` : 'Geen automatische toewijzing'}</span>
                    <button
                      onClick={() => {
                        setDeposit(goal);
                        setDepositAmount('');
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-[color:var(--color-ink-muted)] hover:text-[color:var(--color-neon)]"
                    >
                      <PlusCircle size={13} /> Bedrag
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={openNew}
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[color:var(--color-border-strong)] text-[color:var(--color-ink-muted)] transition-colors hover:border-[color:var(--color-neon)]/40 hover:text-[color:var(--color-ink)]"
            >
              <Plus size={20} />
              <span className="text-sm font-medium">Nieuw doel</span>
            </button>
          </div>
        </>
      )}

      <GoalModal open={modalOpen} onClose={() => setModalOpen(false)} editGoal={editGoal} />

      <Modal open={!!deposit} onClose={() => setDeposit(null)} title={`Bedrag toevoegen`} subtitle={deposit ? `${deposit.icon} ${deposit.name}` : undefined} width={380}>
        <div className="space-y-4">
          <FieldWrap label={`Bedrag (${sym})`}>
            <TextInput value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} inputMode="decimal" placeholder="50,00" autoFocus className="num" />
          </FieldWrap>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setDeposit(null)}>
              Annuleren
            </Button>
            <Button
              className="flex-1"
              disabled={parseAmount(depositAmount) <= 0}
              onClick={() => {
                if (deposit) updateGoal(deposit.id, { currentAmount: Math.min(deposit.targetAmount, roundCents(deposit.currentAmount + parseAmount(depositAmount))) });
                setDeposit(null);
              }}
            >
              Toevoegen
            </Button>
          </div>
        </div>
      </Modal>

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
