import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FieldWrap, TextInput } from '../ui/Field';
import { useStore } from '../../store/useStore';
import type { Job, RateRule } from '../../types';
import { uid } from '../../lib/calc';

const ICON_OPTIONS = ['☕', '🏠', '👶', '🏋️', '💻', '🚗', '🎨', '📦', '🍽️', '🛠️', '🧾', '📚', '🛍️', '🚚', '🎧'];
const COLOR_OPTIONS = ['#39FFB0', '#2FD9E8', '#B18CFF', '#FFC15E', '#FF7E8A', '#6EA8FF'];

type Props = {
  open: boolean;
  onClose: () => void;
  editJob?: Job | null;
};

export default function JobModal({ open, onClose, editJob }: Props) {
  const addJob = useStore((s) => s.addJob);
  const updateJob = useStore((s) => s.updateJob);
  const settings = useStore((s) => s.settings);

  const [icon, setIcon] = useState('☕');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('12,00');
  const [rules, setRules] = useState<RateRule[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editJob) {
      setIcon(editJob.icon);
      setColor(editJob.color);
      setName(editJob.name);
      setRate(editJob.baseRate.toFixed(2).replace('.', ','));
      setRules(editJob.rateRules);
    } else {
      setIcon('☕');
      setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);
      setName('');
      setRate('12,00');
      setRules([]);
    }
  }, [open, editJob]);

  function parseNum(v: string) {
    return Number(v.replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
  }

  function addRule() {
    setRules((r) => [...r, { id: uid(), label: '', delta: 0 }]);
  }

  function updateRule(id: string, patch: Partial<RateRule>) {
    setRules((r) => r.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function removeRule(id: string) {
    setRules((r) => r.filter((rule) => rule.id !== id));
  }

  function handleSave() {
    const payload = {
      name: name.trim() || 'Nieuwe job',
      icon,
      color,
      baseRate: parseNum(rate),
      rateRules: rules.filter((r) => r.label.trim()),
    };
    if (editJob) {
      updateJob(editJob.id, payload);
    } else {
      addJob(payload);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={editJob ? 'Job bewerken' : 'Nieuwe job'} subtitle="Geef je job een naam, icoon en uurloon.">
      <div className="space-y-5">
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

        <div>
          <span className="mb-1.5 block text-xs font-medium text-[color:var(--color-ink-muted)]">Kleur</span>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full border-2 transition-transform"
                style={{ background: c, borderColor: color === c ? '#fff' : 'transparent', transform: color === c ? 'scale(1.1)' : 'scale(1)' }}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Naam">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Café" />
          </FieldWrap>
          <FieldWrap label={`Uurloon (${settings.currencySymbol})`}>
            <TextInput value={rate} onChange={(e) => setRate(e.target.value)} placeholder="12,00" inputMode="decimal" />
          </FieldWrap>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[color:var(--color-ink-muted)]">Speciale tarieven</span>
            <button onClick={addRule} className="flex items-center gap-1 text-xs font-medium text-[color:var(--color-neon)] hover:underline">
              <Plus size={13} /> Regel toevoegen
            </button>
          </div>
          {rules.length === 0 ? (
            <p className="text-xs text-[color:var(--color-ink-faint)]">Geen speciale tarieven. Bijv. "Feestdag" +€2/u.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <TextInput
                    value={rule.label}
                    onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                    placeholder="Feestdag"
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-[color:var(--color-ink-faint)]">+{settings.currencySymbol}</span>
                    <TextInput
                      value={rule.delta}
                      onChange={(e) => updateRule(rule.id, { delta: parseNum(e.target.value) })}
                      inputMode="decimal"
                      className="!w-20 text-center"
                    />
                    <span className="text-xs text-[color:var(--color-ink-faint)]">/u</span>
                  </div>
                  <button onClick={() => removeRule(rule.id)} className="text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-danger)]">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
