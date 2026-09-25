import { useState, type ReactNode } from 'react';
import { Bell, Calendar, Coins, Database, Download, Palette, ShieldCheck, Sparkles, Trash2, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Settings } from '../types';
import { Select, TextInput } from '../components/ui/Field';
import Toggle from '../components/ui/Toggle';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Segmented from '../components/ui/Segmented';
import Logo from '../components/Logo';
import Avatar from '../components/layout/Avatar';
import { formatAmountInput, hm, parseAmount, sessionEarnings, sessionMinutes } from '../lib/calc';

const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'GBP', symbol: '£', label: 'Brits pond (£)' },
  { code: 'CHF', symbol: 'CHF ', label: 'Zwitserse frank (CHF)' },
];

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="glass-card rounded-3xl p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--color-fill-hover)] text-[color:var(--color-neon)]">{icon}</div>
        <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</h2>
      </div>
      <div className="divide-y divide-[color:var(--color-border)]">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[color:var(--color-ink)]">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-[color:var(--color-ink-faint)]">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const jobs = useStore((s) => s.jobs);
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const loadDemoData = useStore((s) => s.loadDemoData);
  const clearAllData = useStore((s) => s.clearAllData);

  const [confirm, setConfirm] = useState<'demo' | 'clear' | null>(null);
  const [defaultRate, setDefaultRate] = useState(formatAmountInput(settings.defaultRate));

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    updateSettings({ [key]: value } as Partial<Settings>);
  }

  const stamp = new Date().toISOString().slice(0, 10);

  function exportJSON() {
    download(`vynra-export-${stamp}.json`, JSON.stringify({ app: 'VYNRA', exportedAt: new Date().toISOString(), jobs, sessions, goals, settings }, null, 2), 'application/json');
  }

  function exportCSV() {
    const header = ['datum', 'job', 'type', 'start', 'eind', 'pauze_min', 'minuten', 'uurloon', 'bedrag', 'notitie'];
    const kind = { worked: 'gewerkt', manual: 'handmatig', planned: 'gepland' } as const;
    const rows = sessions
      .slice()
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .map((s) => {
        const job = jobs.find((j) => j.id === s.jobId);
        const amount = sessionEarnings(s, job);
        const mins = sessionMinutes(s);
        return [s.date, job?.name ?? '', kind[s.kind], hm(s.startTime), hm(s.endTime), Math.round(s.breakMinutes), Math.round(mins), (mins ? amount / (mins / 60) : 0).toFixed(2), amount.toFixed(2), s.note ?? ''];
      });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    download(`vynra-sessies-${stamp}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:hidden" style={{ fontFamily: 'var(--font-display)' }}>
          Instellingen
        </h1>
        <p className="text-sm text-[color:var(--color-ink-muted)]">Profiel, voorkeuren en je gegevens.</p>
      </div>

      <Section icon={<User size={15} />} title="Profiel & account">
        <div className="flex items-center gap-4 pb-4">
          <Avatar name={settings.profileName} size={52} />
          <div className="min-w-0 flex-1">
            <TextInput value={settings.profileName} onChange={(e) => set('profileName', e.target.value)} placeholder="Je naam" aria-label="Naam" />
          </div>
        </div>
        <Row label="Plan" hint="Alle kernfuncties inbegrepen">
          <span className="rounded-full bg-[color:var(--color-neon)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--color-neon)]">VYNRA Free · Actief</span>
        </Row>
      </Section>

      <Section icon={<Coins size={15} />} title="Geld & tijd">
        <Row label="Valuta">
          <Select
            value={settings.currency}
            onChange={(e) => {
              const c = CURRENCIES.find((x) => x.code === e.target.value);
              if (c) updateSettings({ currency: c.code, currencySymbol: c.symbol });
            }}
            className="!w-52"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </Row>
        <Row label="Standaardtarief" hint="Startpunt voor een nieuwe job">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-[color:var(--color-ink-faint)]">{settings.currencySymbol}</span>
            <TextInput
              value={defaultRate}
              inputMode="decimal"
              onChange={(e) => setDefaultRate(e.target.value)}
              onBlur={() => {
                const v = parseAmount(defaultRate);
                set('defaultRate', v);
                setDefaultRate(formatAmountInput(v));
              }}
              className="num !w-24"
            />
            <span className="text-sm text-[color:var(--color-ink-faint)]">/u</span>
          </div>
        </Row>
        <Row label="Afronding gewerkte tijd" hint="Geldt voor alle opgeslagen sessies, live en handmatig">
          <Select value={settings.rounding} onChange={(e) => set('rounding', e.target.value as Settings['rounding'])} className="!w-52">
            <option value="none">Niet afronden (op de seconde)</option>
            <option value="min1">Op hele minuten</option>
            <option value="min5">Op 5 minuten</option>
            <option value="min15">Op 15 minuten</option>
          </Select>
        </Row>
      </Section>

      <Section icon={<Calendar size={15} />} title="Kalender">
        <Row label="Week begint op">
          <Segmented
            size="sm"
            className="w-48"
            value={settings.weekStart}
            onChange={(v) => set('weekStart', v)}
            options={[
              { value: 'monday', label: 'Maandag' },
              { value: 'sunday', label: 'Zondag' },
            ]}
          />
        </Row>
        <Row label="Tijdzone" hint="Automatisch overgenomen van dit apparaat">
          <span className="num rounded-xl border border-[color:var(--color-border)] px-3 py-2 text-sm text-[color:var(--color-ink-muted)]">
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </span>
        </Row>
      </Section>

      <Section icon={<Bell size={15} />} title="Meldingen & motivatie">
        <Row label="Notificaties" hint="Geplande diensten, vergeten starts en voortgang van doelen">
          <Toggle checked={settings.notifications} onChange={(v) => set('notifications', v)} />
        </Row>
        <Row label="Next milestone" hint="Toon een klein tussendoel tijdens een actieve sessie">
          <Toggle checked={settings.showMilestone} onChange={(v) => set('showMilestone', v)} />
        </Row>
        {settings.showMilestone && (
          <Row label="Milestone-stappen" hint="Om de hoeveel geld een nieuwe milestone">
            <Segmented
              size="sm"
              className="w-52"
              value={String(settings.milestoneStep)}
              onChange={(v) => set('milestoneStep', Number(v))}
              options={['5', '10', '25', '50'].map((v) => ({ value: v, label: `${settings.currencySymbol.trim()}${v}` }))}
            />
          </Row>
        )}
      </Section>

      <Section icon={<Palette size={15} />} title="Weergave">
        <Row label="Thema">
          <Segmented
            size="sm"
            className="w-48"
            value={settings.theme}
            onChange={(v) => set('theme', v)}
            options={[
              { value: 'dark', label: 'Donker' },
              { value: 'light', label: 'Licht' },
            ]}
          />
        </Row>
        <Row label="Taal">
          <Select value={settings.language} onChange={(e) => set('language', e.target.value as Settings['language'])} className="!w-52">
            <option value="nl">Nederlands</option>
            <option value="en" disabled>
              English (binnenkort)
            </option>
          </Select>
        </Row>
      </Section>

      <Section icon={<Database size={15} />} title="Gegevens">
        <Row label="Gegevens exporteren" hint={`${sessions.length} sessies, ${jobs.length} jobs, ${goals.length} doelen`}>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportCSV}>
              CSV
            </Button>
            <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={exportJSON}>
              JSON
            </Button>
          </div>
        </Row>
        <Row label="Voorbeelddata laden" hint="Verken VYNRA met realistische demo-sessies">
          <Button size="sm" variant="outline" icon={<Sparkles size={14} />} onClick={() => setConfirm('demo')}>
            Laden
          </Button>
        </Row>
        <Row label="Alles wissen" hint="Verwijdert al je gegevens van dit apparaat">
          <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirm('clear')}>
            Wissen
          </Button>
        </Row>
      </Section>

      <Section icon={<ShieldCheck size={15} />} title="Privacy">
        <p className="text-sm leading-relaxed text-[color:var(--color-ink-muted)]">
          Al je gegevens blijven lokaal op dit apparaat, in je browser. VYNRA stuurt niets naar een server. Bedragen zijn bruto en gebaseerd op de tarieven die jij invoert.
        </p>
      </Section>

      <div className="flex flex-col items-center gap-2 pt-4 opacity-80">
        <Logo size={24} withTagline />
      </div>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'demo' ? 'Voorbeelddata laden?' : 'Alles wissen?'} width={400}>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          {confirm === 'demo'
            ? 'Je huidige jobs, sessies en doelen worden vervangen door voorbeelddata.'
            : 'Al je jobs, sessies, doelen en instellingen worden verwijderd. Je begint opnieuw bij de onboarding.'}{' '}
          Dit kan niet ongedaan worden gemaakt.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" onClick={() => setConfirm(null)} className="flex-1">
            Annuleren
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (confirm === 'demo') loadDemoData();
              else clearAllData();
              setConfirm(null);
            }}
          >
            {confirm === 'demo' ? 'Laden' : 'Alles wissen'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
