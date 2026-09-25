import { useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FieldWrap, TextInput } from '../ui/Field';
import { JOB_COLORS, useStore } from '../../store/useStore';
import type { Job } from '../../types';
import { formatAmountInput, formatCurrency, parseAmount, uid } from '../../lib/calc';

const ICON_OPTIONS = ['☕', '🏠', '👶', '🏋️', '💻', '🚗', '🎨', '📦', '🍽️', '🛠️', '🧾', '📚', '🛍️', '🚚', '🎧', '🐕'];
const RULE_SUGGESTIONS = ['Feestdag', 'Zondag', 'Zaterdag', 'Avond', 'Nacht'];

type Props = {
  open: boolean;
  onClose: () => void;
  editJob?: Job | null;
};

type DraftRule = { id: string; label: string; delta: string };

export default function JobModal({ open, onClose, editJob }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={editJob ? 'Job bewerken' : 'Nieuwe job'} subtitle="Naam, icoon, uurloon en je eigen speciale tarieven." width={520}>
      <JobForm key={editJob?.id ?? 'new'} onClose={onClose} editJob={editJob ?? null} />
    </Modal>
  );
}

function JobForm({ onClose, editJob }: { onClose: () => void; editJob: Job | null }) {
  const addJob = useStore((s) => s.addJob);
  const updateJob = useStore((s) => s.updateJob);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);

  const [icon, setIcon] = useState(editJob?.icon ?? '☕');
  const [color, setColor] = useState(editJob?.color ?? JOB_COLORS[jobs.filter((j) => !j.archived).length % JOB_COLORS.length]);
  const [name, setName] = useState(editJob?.name ?? '');
  const [rate, setRate] = useState(formatAmountInput(editJob?.baseRate ?? settings.defaultRate));
  const [rules, setRules] = useState<DraftRule[]>(() => (editJob?.rateRules ?? []).map((r) => ({ id: r.id, label: r.label, delta: formatAmountInput(r.delta) })));

  const base = parseAmount(rate);
  const valid = name.trim().length > 0 && base >= 0;

  function addRule(label = '') {
    setRules((r) => [...r, { id: uid(), label, delta: '1,00' }]);
  }

  function updateRule(id: string, patch: Partial<DraftRule>) {
    setRules((r) => r.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function handleSave() {
    if (!valid) return;
    const payload = {
      name: name.trim(),
      icon: icon.trim() || '💼',
      color,
      baseRate: base,
      rateRules: rules.filter((r) => r.label.trim()).map((r) => ({ id: r.id, label: r.label.trim(), delta: parseAmount(r.delta) })),
    };
    if (editJob) updateJob(editJob.id, payload);
    else addJob(payload);
    onClose();
  }

  const unusedSuggestions = RULE_SUGGESTIONS.filter((s) => !rules.some((r) => r.label.toLowerCase() === s.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-1.5 block text-xs font-medium text-[color:var(--color-ink-muted)]">Icoon</span>
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
          <TextInput
            value={ICON_OPTIONS.includes(icon) ? '' : icon}
            onChange={(e) => setIcon([...e.target.value].slice(-2).join(''))}
            placeholder="Eigen"
            aria-label="Eigen emoji"
            className="!h-10 !w-16 text-center"
          />
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-[color:var(--color-ink-muted)]">Kleur in grafieken</span>
        <div className="flex gap-2.5">
          {JOB_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Kleur ${c}`}
              aria-pressed={color === c}
              className="h-8 w-8 rounded-full ring-offset-2 ring-offset-[color:var(--color-bg-elevated)] transition-transform"
              style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--color-bg-elevated), 0 0 0 4px ${c}` : undefined, transform: color === c ? 'scale(1.05)' : undefined }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_140px] gap-3">
        <FieldWrap label="Naam">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Café" autoFocus />
        </FieldWrap>
        <FieldWrap label={`Uurloon (${settings.currencySymbol})`}>
          <TextInput value={rate} onChange={(e) => setRate(e.target.value)} placeholder="12,00" inputMode="decimal" className="num" />
        </FieldWrap>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[color:var(--color-ink-muted)]">Speciale tarieven</span>
          <button type="button" onClick={() => addRule()} className="flex items-center gap-1 text-xs font-medium text-[color:var(--color-neon)] hover:underline">
            <Plus size={13} /> Regel toevoegen
          </button>
        </div>

        {rules.length > 0 && (
          <div className="mb-3 space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2">
                <TextInput value={rule.label} onChange={(e) => updateRule(rule.id, { label: e.target.value })} placeholder="Feestdag" className="flex-1" aria-label="Naam tarief" />
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-xs text-[color:var(--color-ink-faint)]">+{settings.currencySymbol}</span>
                  <TextInput
                    value={rule.delta}
                    onChange={(e) => updateRule(rule.id, { delta: e.target.value })}
                    inputMode="decimal"
                    className="num !w-20 text-center"
                    aria-label="Toeslag per uur"
                  />
                  <span className="w-14 text-right text-[11px] text-[color:var(--color-ink-faint)] tabular">= {formatCurrency(base + parseAmount(rule.delta), settings.currencySymbol)}</span>
                </div>
                <button type="button" onClick={() => setRules((r) => r.filter((x) => x.id !== rule.id))} aria-label="Verwijderen" className="p-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-danger)]">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {unusedSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addRule(s)}
                className="rounded-lg border border-dashed border-[color:var(--color-border-strong)] px-2.5 py-1 text-xs text-[color:var(--color-ink-muted)] hover:border-[color:var(--color-neon)]/40 hover:text-[color:var(--color-ink)]"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[color:var(--color-ink-faint)]">
          <Info size={12} className="mt-0.5 shrink-0" />
          Jij bepaalt zelf de bedragen. VYNRA doet geen aannames over wettelijke toeslagen of feestdagen — je kiest het tarief bij het starten van een sessie.
        </p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button variant="secondary" onClick={onClose} className="ml-auto">
          Annuleren
        </Button>
        <Button onClick={handleSave} disabled={!valid}>
          {editJob ? 'Opslaan' : 'Job aanmaken'}
        </Button>
      </div>
    </div>
  );
}
