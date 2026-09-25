import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FieldWrap, TextInput } from '../ui/Field';
import { useStore } from '../../store/useStore';
import type { Goal } from '../../types';
import { formatAmountInput, formatCurrency, formatDurationLong, parseAmount } from '../../lib/calc';
import { averageHourlyValue, workedSessions } from '../../lib/stats';

const ICON_OPTIONS = ['💻', '✈️', '🚗', '🏠', '🎮', '📷', '🎸', '🛋️', '👟', '🎓', '🚲', '💍'];

type Props = {
  open: boolean;
  onClose: () => void;
  editGoal?: Goal | null;
};

export default function GoalModal({ open, onClose, editGoal }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={editGoal ? 'Doel bewerken' : 'Nieuw spaardoel'} subtitle="Waar werk je naartoe?">
      <GoalForm key={editGoal?.id ?? 'new'} onClose={onClose} editGoal={editGoal ?? null} />
    </Modal>
  );
}

function GoalForm({ onClose, editGoal }: { onClose: () => void; editGoal: Goal | null }) {
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const goals = useStore((s) => s.goals);
  const sessions = useStore((s) => s.sessions);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);

  const [icon, setIcon] = useState(editGoal?.icon ?? '💻');
  const [name, setName] = useState(editGoal?.name ?? '');
  const [target, setTarget] = useState(editGoal ? formatAmountInput(editGoal.targetAmount) : '');
  const [current, setCurrent] = useState(editGoal ? formatAmountInput(editGoal.currentAmount) : '0,00');
  const [allocation, setAllocation] = useState(String(editGoal?.allocationPercent ?? 0));

  const otherAllocated = goals.filter((g) => g.id !== editGoal?.id).reduce((sum, g) => sum + (g.allocationPercent ?? 0), 0);
  const maxAllocation = Math.max(0, 100 - otherAllocated);
  const alloc = Math.min(maxAllocation, Math.max(0, Math.round(parseAmount(allocation))));
  const targetAmount = parseAmount(target);
  const currentAmount = parseAmount(current);
  const rate = averageHourlyValue(workedSessions(sessions), jobs) || jobs.find((j) => !j.archived)?.baseRate || settings.defaultRate;
  const valid = name.trim().length > 0 && targetAmount > 0 && currentAmount >= 0;

  function handleSave() {
    if (!valid) return;
    const payload = {
      name: name.trim(),
      icon,
      targetAmount,
      currentAmount: Math.min(currentAmount, targetAmount),
      allocationPercent: alloc || undefined,
    };
    if (editGoal) updateGoal(editGoal.id, payload);
    else addGoal(payload);
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ICON_OPTIONS.map((ic) => (
          <button
            key={ic}
            type="button"
            onClick={() => setIcon(ic)}
            aria-pressed={icon === ic}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-all ${
              icon === ic ? 'border-[color:var(--color-neon)] bg-[color:var(--color-neon)]/10' : 'border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)]'
            }`}
          >
            {ic}
          </button>
        ))}
      </div>

      <FieldWrap label="Naam">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nieuwe laptop" autoFocus />
      </FieldWrap>

      <div className="grid grid-cols-2 gap-3">
        <FieldWrap label={`Doelbedrag (${settings.currencySymbol})`}>
          <TextInput value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="1.200,00" className="num" />
        </FieldWrap>
        <FieldWrap label={`Huidig bedrag (${settings.currencySymbol})`}>
          <TextInput value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal" className="num" />
        </FieldWrap>
      </div>

      <FieldWrap
        label="Automatisch toewijzen (optioneel)"
        hint={`Dit percentage van elke gewerkte sessie gaat naar dit doel. Nog ${maxAllocation}% beschikbaar.`}
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={maxAllocation}
            step={5}
            value={alloc}
            onChange={(e) => setAllocation(e.target.value)}
            className="flex-1 accent-[color:var(--color-neon)]"
            aria-label="Percentage toewijzen"
          />
          <span className="num w-12 text-right text-sm font-semibold text-[color:var(--color-ink)]">{alloc}%</span>
        </div>
      </FieldWrap>

      {targetAmount > 0 && (
        <div className="rounded-2xl border border-[color:var(--color-neon)]/20 bg-[color:var(--color-neon)]/[0.05] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-ink-faint)]">Money Journey</p>
          <p className="num mt-1 text-xl font-bold text-[color:var(--color-ink)]">
            {formatDurationLong((targetAmount / rate) * 60)} → {formatCurrency(targetAmount, settings.currencySymbol)}
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--color-ink-muted)]">bij jouw gemiddelde van {formatCurrency(rate, settings.currencySymbol)}/u</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} className="ml-auto">
          Annuleren
        </Button>
        <Button onClick={handleSave} disabled={!valid}>
          {editGoal ? 'Opslaan' : 'Doel aanmaken'}
        </Button>
      </div>
    </div>
  );
}
