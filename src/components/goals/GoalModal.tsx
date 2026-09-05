import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FieldWrap, TextInput } from '../ui/Field';
import { useStore } from '../../store/useStore';
import type { Goal } from '../../types';

const ICON_OPTIONS = ['💻', '✈️', '🚗', '🏠', '🎮', '📷', '🎸', '🛋️', '👟', '💍'];

type Props = {
  open: boolean;
  onClose: () => void;
  editGoal?: Goal | null;
};

export default function GoalModal({ open, onClose, editGoal }: Props) {
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const settings = useStore((s) => s.settings);

  const [icon, setIcon] = useState('💻');
  const [name, setName] = useState('');
  const [target, setTarget] = useState('1200');
  const [current, setCurrent] = useState('0');
  const [allocation, setAllocation] = useState('0');

  useEffect(() => {
    if (!open) return;
    if (editGoal) {
      setIcon(editGoal.icon);
      setName(editGoal.name);
      setTarget(String(editGoal.targetAmount));
      setCurrent(String(editGoal.currentAmount));
      setAllocation(String(editGoal.allocationPercent ?? 0));
    } else {
      setIcon('💻');
      setName('');
      setTarget('1200');
      setCurrent('0');
      setAllocation('0');
    }
  }, [open, editGoal]);

  function parseNum(v: string) {
    return Number(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
  }

  function handleSave() {
    const payload = {
      name: name.trim() || 'Nieuw doel',
      icon,
      targetAmount: parseNum(target),
      currentAmount: parseNum(current),
      allocationPercent: parseNum(allocation) || undefined,
    };
    if (editGoal) updateGoal(editGoal.id, payload);
    else addGoal(payload);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editGoal ? 'Doel bewerken' : 'Nieuw spaardoel'} subtitle="Waar werk je naartoe?">
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-[color:var(--color-ink-muted)]">Icoon</span>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-base border transition-all ${
                  icon === ic ? 'border-[color:var(--color-neon)] bg-[color:var(--color-neon)]/10' : 'border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)]'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <FieldWrap label="Naam">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nieuwe laptop" />
        </FieldWrap>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label={`Doelbedrag (${settings.currencySymbol})`}>
            <TextInput value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
          </FieldWrap>
          <FieldWrap label={`Huidig bedrag (${settings.currencySymbol})`}>
            <TextInput value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal" />
          </FieldWrap>
        </div>

        <FieldWrap
          label="Automatisch toewijzen (% van nieuwe sessies)"
          hint="Optioneel. Bij elke gestopte sessie wordt dit percentage van je verdiensten toegevoegd aan dit doel."
        >
          <TextInput value={allocation} onChange={(e) => setAllocation(e.target.value)} inputMode="decimal" placeholder="0" />
        </FieldWrap>

        <div className="flex items-center gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} className="ml-auto">
            Annuleren
          </Button>
          <Button onClick={handleSave}>Opslaan</Button>
        </div>
      </div>
    </Modal>
  );
}
