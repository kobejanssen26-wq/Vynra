import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Play } from 'lucide-react';
import Logo, { LogoMark } from '../components/Logo';
import Button from '../components/ui/Button';
import { FieldWrap, TextInput } from '../components/ui/Field';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/calc';

const ICON_OPTIONS = ['☕', '🏠', '👶', '🏋️', '💻', '🚗', '🎨', '📦', '🍽️', '🛠️'];

export default function Onboarding() {
  const navigate = useNavigate();
  const addJob = useStore((s) => s.addJob);
  const updateSettings = useStore((s) => s.updateSettings);
  const startSession = useStore((s) => s.startSession);
  const settings = useStore((s) => s.settings);

  const [step, setStep] = useState(0);
  const [jobName, setJobName] = useState('Café');
  const [jobIcon, setJobIcon] = useState('☕');
  const [rate, setRate] = useState('12,00');
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  function parseRate(v: string) {
    return Number(v.replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
  }

  function handleCreateJob() {
    const id = addJob({
      name: jobName.trim() || 'Mijn job',
      icon: jobIcon,
      baseRate: parseRate(rate),
      color: '#39FFB0',
      rateRules: [],
    });
    setCreatedJobId(id);
    setStep(2);
  }

  function finish(startNow: boolean) {
    updateSettings({ onboarded: true });
    if (startNow && createdJobId) {
      startSession(createdJobId, null);
    }
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Logo size={34} withTagline />
        </div>

        <div className="flex justify-center gap-1.5 mb-8">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-[color:var(--color-neon)]' : 'w-4 bg-white/15'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="s0"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="glass-card rounded-3xl p-8 text-center"
            >
              <div className="flex justify-center mb-6">
                <div className="rounded-2xl bg-[color:var(--color-neon)]/10 p-4">
                  <LogoMark size={56} />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-[color:var(--color-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
                Welkom bij VYNRA.
              </h1>
              <p className="mt-3 text-[color:var(--color-ink-muted)]">
                Turn time into more. Volg je gewerkte tijd en zie live hoeveel geld je verdient.
              </p>
              <Button fullWidth size="lg" className="mt-8" icon={<ArrowRight size={18} />} onClick={() => setStep(1)}>
                Aan de slag
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="glass-card rounded-3xl p-8"
            >
              <h1 className="text-xl font-bold text-[color:var(--color-ink)]">Wat verdien je?</h1>
              <p className="mt-1.5 mb-6 text-sm text-[color:var(--color-ink-muted)]">Maak je eerste job.</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setJobIcon(ic)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg border transition-all ${
                      jobIcon === ic
                        ? 'border-[color:var(--color-neon)] bg-[color:var(--color-neon)]/10'
                        : 'border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)]'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <FieldWrap label="Naam">
                  <TextInput value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="Café" />
                </FieldWrap>
                <FieldWrap label={`Uurloon (${settings.currencySymbol})`}>
                  <TextInput value={rate} onChange={(e) => setRate(e.target.value)} placeholder="12,00" inputMode="decimal" />
                </FieldWrap>
              </div>

              <Button fullWidth size="lg" className="mt-8" icon={<ArrowRight size={18} />} onClick={handleCreateJob}>
                Job aanmaken
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="glass-card rounded-3xl p-8 text-center"
            >
              <div className="flex justify-center mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--color-neon)]/10 text-[color:var(--color-neon)]">
                  <Check size={26} />
                </div>
              </div>
              <h1 className="text-xl font-bold text-[color:var(--color-ink)]">Klaar om te beginnen?</h1>
              <p className="mt-2 text-sm text-[color:var(--color-ink-muted)]">
                Start je eerste sessie en zie je inkomsten live groeien.
              </p>

              <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-white/[0.03] px-4 py-3">
                <span className="text-lg">{jobIcon}</span>
                <span className="text-sm font-medium text-[color:var(--color-ink)]">{jobName || 'Mijn job'}</span>
                <span className="text-sm text-[color:var(--color-ink-faint)]">·</span>
                <span className="text-sm text-[color:var(--color-neon)]">{formatCurrency(parseRate(rate), settings.currencySymbol)}/u</span>
              </div>

              <Button fullWidth size="lg" className="mt-8" icon={<Play size={18} fill="currentColor" />} onClick={() => finish(true)}>
                Start eerste sessie
              </Button>
              <button
                onClick={() => finish(false)}
                className="mt-3 text-sm text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)]"
              >
                Later beginnen
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
