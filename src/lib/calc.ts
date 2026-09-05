import type { Job, RateRule, Session, Settings } from '../types';

export function effectiveRate(job: Job | undefined, rateId: string | null): number {
  if (!job) return 0;
  if (!rateId) return job.baseRate;
  const rule = job.rateRules.find((r) => r.id === rateId);
  if (!rule) return job.baseRate;
  return job.baseRate + rule.delta;
}

export function rateLabel(job: Job | undefined, rateId: string | null): string {
  if (!job) return '';
  if (!rateId) return 'Normaal';
  const rule = job.rateRules.find((r) => r.id === rateId);
  return rule ? rule.label : 'Normaal';
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Duration in minutes between two HH:mm times, minus break. Handles overnight (end < start).
export function sessionDurationMinutes(startTime: string, endTime: string, breakMinutes = 0): number {
  let start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end < start) end += 24 * 60;
  return Math.max(0, end - start - breakMinutes);
}

export function moneyFromMinutes(minutes: number, hourlyRate: number): number {
  const raw = (minutes / 60) * hourlyRate;
  return Math.round(raw * 100) / 100;
}

export function moneyFromSeconds(seconds: number, hourlyRate: number): number {
  const raw = (seconds / 3600) * hourlyRate;
  return Math.round(raw * 100) / 100;
}

export function applyRounding(amount: number, rounding: Settings['rounding']): number {
  if (rounding === 'none') return amount;
  const step = rounding === 'nearest5' ? 5 / 100 : 15 / 100;
  return Math.round(amount / step) * step;
}

export function formatCurrency(amount: number, symbol = '€'): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const [intPart, decPart] = rounded.toFixed(2).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${symbol}${withThousands},${decPart}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h <= 0) return `${m}m`;
  return `${h}u ${m.toString().padStart(2, '0')}m`;
}

export function formatDurationLong(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}u ${m.toString().padStart(2, '0')}m`;
}

export function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

export function sessionEarnings(session: Session, job: Job | undefined): number {
  const rate = effectiveRate(job, session.rateId);
  const minutes = sessionDurationMinutes(session.startTime, session.endTime, session.breakMinutes);
  return moneyFromMinutes(minutes, rate);
}

export function sessionMinutes(session: Session): number {
  return sessionDurationMinutes(session.startTime, session.endTime, session.breakMinutes);
}

export function todayISO(): string {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowHM(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export const WEEKDAY_LABELS_NL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
export const WEEKDAY_SHORT_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
export const MONTH_LABELS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export function formatDayHeading(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00');
  const weekday = WEEKDAY_LABELS_NL[d.getDay()];
  return `${weekday} ${d.getDate()} ${MONTH_LABELS_NL[d.getMonth()]}`;
}

export function isSameDay(aISO: string, bISO: string): boolean {
  return aISO === bISO;
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function startOfWeek(dateISO: string, weekStart: 'monday' | 'sunday' = 'monday'): string {
  const d = new Date(dateISO + 'T00:00:00');
  const day = d.getDay(); // 0 sun .. 6 sat
  const offset = weekStart === 'monday' ? (day === 0 ? 6 : day - 1) : day;
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function startOfMonth(dateISO: string): string {
  const d = new Date(dateISO + 'T00:00:00');
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function rateRulesForJob(job: Job | undefined): RateRule[] {
  return job?.rateRules ?? [];
}
