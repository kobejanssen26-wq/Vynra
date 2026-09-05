import { useState, type ReactNode } from 'react';
import {
  Bell,
  Calendar,
  Coins,
  Download,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { seedDemoData } from '../store/useStore';
import type { Settings } from '../types';
import { Select, TextInput } from '../components/ui/Field';
import Toggle from '../components/ui/Toggle';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Logo from '../components/Logo';

const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'GBP', symbol: '£', label: 'Brits pond (£)' },
];

const TIMEZONES = ['Europe/Amsterdam', 'Europe/Brussels', 'Europe/London', 'Europe/Berlin', 'UTC'];

function SettingsSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-[color:var(--color-neon)]">{icon}</div>
        <h3 className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-[color:var(--color-ink)]">{label}</p>
        {hint && <p className="text-xs text-[color:var(--color-ink-faint)] mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);

  const [resetOpen, setResetOpen] = useState(false);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    updateSettings({ [key]: value } as Partial<Settings>);
  }

  function handleExport() {
    const data = { jobs, sessions, goals, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vynra-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleResetToDemo() {
    seedDemoData();
    setResetOpen(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="lg:hidden text-2xl font-bold text-[color:var(--color-ink)]">Instellingen</h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">Personaliseer VYNRA naar jouw voorkeuren.</p>
      </div>

      <SettingsSection icon={<Coins size={15} />} title="Valuta & tarieven">
        <Row label="Valuta">
          <Select
            value={settings.currency}
            onChange={(e) => {
              const c = CURRENCIES.find((c) => c.code === e.target.value);
              if (c) updateSettings({ currency: c.code, currencySymbol: c.symbol });
            }}
            className="!w-44"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="Standaardtarief" hint="Gebruikt als startpunt bij een nieuwe job">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[color:var(--color-ink-faint)]">{settings.currencySymbol}</span>
            <TextInput
              type="number"
              value={settings.defaultRate}
              onChange={(e) => set('defaultRate', Number(e.target.value) || 0)}
              className="!w-24"
            />
          </div>
        </Row>
        <Row label="Afronding bedragen">
          <Select value={settings.rounding} onChange={(e) => set('rounding', e.target.value as Settings['rounding'])} className="!w-44">
            <option value="none">Niet afronden</option>
            <option value="nearest5">Op 5 cent</option>
            <option value="nearest15">Op 15 cent</option>
          </Select>
        </Row>
      </SettingsSection>

      <SettingsSection icon={<Calendar size={15} />} title="Kalender & tijd">
        <Row label="Week begint op">
          <Select value={settings.weekStart} onChange={(e) => set('weekStart', e.target.value as Settings['weekStart'])} className="!w-36">
            <option value="monday">Maandag</option>
            <option value="sunday">Zondag</option>
          </Select>
        </Row>
        <Row label="Tijdzone">
          <Select value={settings.timezone} onChange={(e) => set('timezone', e.target.value)} className="!w-52">
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Row>
      </SettingsSection>

      <SettingsSection icon={<Bell size={15} />} title="Notificaties">
        <Row label="Meldingen" hint="Ontvang updates over je sessies en doelen">
          <Toggle checked={settings.notifications} onChange={(v) => set('notifications', v)} />
        </Row>
        <Row label="Next milestone tijdens sessie" hint="Toon een klein tussendoel tijdens het werken">
          <Toggle checked={settings.showMilestone} onChange={(v) => set('showMilestone', v)} />
        </Row>
      </SettingsSection>

      <SettingsSection icon={<Moon size={15} />} title="Weergave">
        <Row label="Thema">
          <div className="flex rounded-xl border border-[color:var(--color-border-strong)] p-1">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                onClick={() => set('theme', t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  settings.theme === t ? 'bg-[color:var(--color-neon)] text-[#04140d]' : 'text-[color:var(--color-ink-muted)]'
                }`}
              >
                {t === 'dark' ? 'Donker' : 'Licht'}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Taal">
          <Select value={settings.language} onChange={(e) => set('language', e.target.value as Settings['language'])} className="!w-36">
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </Select>
        </Row>
      </SettingsSection>

      <SettingsSection icon={<Download size={15} />} title="Gegevens">
        <Row label="Gegevens exporteren" hint="Download al je jobs, sessies en doelen als JSON">
          <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={handleExport}>
            Exporteren
          </Button>
        </Row>
        <Row label="Terugzetten naar demo-data" hint="Vervangt je huidige gegevens door voorbeelddata">
          <Button size="sm" variant="outline" icon={<RotateCcw size={14} />} onClick={() => setResetOpen(true)}>
            Resetten
          </Button>
        </Row>
      </SettingsSection>

      <SettingsSection icon={<User size={15} />} title="Account & privacy">
        <Row label="Plan" hint="VYNRA Free — alle kernfuncties inbegrepen">
          <span className="rounded-full bg-[color:var(--color-neon)]/10 px-3 py-1 text-xs font-medium text-[color:var(--color-neon)]">Free</span>
        </Row>
        <Row label="Gegevens & privacy" hint="Al je data wordt lokaal op dit apparaat bewaard">
          <ShieldCheck size={16} className="text-[color:var(--color-ink-faint)]" />
        </Row>
      </SettingsSection>

      <div className="flex items-center justify-center gap-2 pt-2 opacity-60">
        <Logo size={18} withWordmark={false} />
        <span className="text-xs text-[color:var(--color-ink-faint)]">VYNRA · Turn time into more.</span>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Terugzetten naar demo-data?" width={380}>
        <div className="flex items-start gap-2.5 rounded-2xl border border-[color:var(--color-warn)]/25 bg-[color:var(--color-warn)]/10 px-3.5 py-3 text-xs text-[color:var(--color-warn)] mb-4">
          <Sparkles size={14} className="mt-0.5 shrink-0" />
          <span>Je huidige jobs, sessies en doelen worden vervangen door voorbeelddata. Dit kan niet ongedaan gemaakt worden.</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setResetOpen(false)} className="flex-1">
            Annuleren
          </Button>
          <Button variant="danger" onClick={handleResetToDemo} className="flex-1">
            Resetten
          </Button>
        </div>
      </Modal>
    </div>
  );
}
