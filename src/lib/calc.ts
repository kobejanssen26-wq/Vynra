import type { Job, Rounding, Session } from '../types';

/* ------------------------------------------------------------------ */
/* Rates                                                               */
/* ------------------------------------------------------------------ */

export function effectiveRate(job: Job | undefined, rateId: string | null): number {
  if (!job) return 0;
  if (!rateId) return job.baseRate;
  const rule = job.rateRules.find((r) => r.id === rateId);
  if (!rule) return job.baseRate;
  return job.baseRate + rule.delta;
}

export function rateLabel(job: Job | undefined, rateId: string | null): string {
  if (!job || !rateId) return 'Normaal';
  return job.rateRules.find((r) => r.id === rateId)?.label ?? 'Normaal';
}

/** The hourly rate a stored session is paid at: its own snapshot, else the job's current rate. */
export function sessionRate(session: Session, job: Job | undefined): number {
  return session.rate ?? effectiveRate(job, session.rateId);
}

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

/** Seconds since midnight for "HH:mm" or "HH:mm:ss". */
export function timeToSeconds(time: string): number {
  const [h = 0, m = 0, s = 0] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

/** Worked seconds between two clock times minus the break. Handles overnight (end < start). */
export function sessionDurationSeconds(startTime: string, endTime: string, breakMinutes = 0): number {
  const start = timeToSeconds(startTime);
  let end = timeToSeconds(endTime);
  if (end < start) end += 24 * 3600;
  return Math.max(0, end - start - breakMinutes * 60);
}

/** Wall-clock seconds between two clock times, breaks included. */
export function grossDurationSeconds(startTime: string, endTime: string): number {
  return sessionDurationSeconds(startTime, endTime, 0);
}

/* The user's rounding preference; applied to every stored session so live and manual
   sessions are always calculated the same way. Set from the store. */
let roundingSeconds = 0;

export function roundingToSeconds(rounding: Rounding): number {
  return { none: 0, min1: 60, min5: 300, min15: 900 }[rounding] ?? 0;
}

export function setRounding(rounding: Rounding) {
  roundingSeconds = roundingToSeconds(rounding);
}

export function applyRounding(seconds: number): number {
  if (!roundingSeconds) return seconds;
  return Math.round(seconds / roundingSeconds) * roundingSeconds;
}

export function sessionSeconds(session: Session): number {
  return applyRounding(sessionDurationSeconds(session.startTime, session.endTime, session.breakMinutes));
}

export function sessionMinutes(session: Session): number {
  return sessionSeconds(session) / 60;
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export function roundCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/** earnings = worked seconds / 3600 × hourly rate, rounded to whole cents. */
export function moneyFromSeconds(seconds: number, hourlyRate: number): number {
  return roundCents((seconds / 3600) * hourlyRate);
}

export function sessionEarnings(session: Session, job: Job | undefined): number {
  return moneyFromSeconds(sessionSeconds(session), sessionRate(session, job));
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function formatCurrency(amount: number, symbol = '€'): string {
  const rounded = roundCents(amount);
  const negative = rounded < 0;
  const [intPart, decPart] = Math.abs(rounded).toFixed(2).split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '−' : ''}${symbol}${withThousands},${decPart}`;
}

/** Compact currency for axes and small cells: €1.200 / €54 / €7,50 */
export function formatCurrencyShort(amount: number, symbol = '€'): string {
  const rounded = roundCents(amount);
  if (Number.isInteger(rounded) || Math.abs(rounded) >= 100) {
    return `${symbol}${Math.round(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }
  return formatCurrency(rounded, symbol);
}

export function formatDurationLong(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}u ${m.toString().padStart(2, '0')}m`;
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total}m`;
  return formatDurationLong(total);
}

export function formatHMS(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, '0')).join(':');
}

/** "13:30:12" → "13:30" */
export function hm(time: string): string {
  return time.slice(0, 5);
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function timeOf(d: Date, withSeconds = false): string {
  const base = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return withSeconds ? `${base}:${pad2(d.getSeconds())}` : base;
}

export function nowHM(): string {
  return timeOf(new Date());
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function fromISODate(dateISO: string): Date {
  return new Date(dateISO + 'T00:00:00');
}

/** Epoch ms for a local date + clock time. */
export function dateTimeToMs(dateISO: string, time: string): number {
  return fromISODate(dateISO).getTime() + timeToSeconds(time) * 1000;
}

export const WEEKDAY_LABELS_NL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
export const WEEKDAY_SHORT_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
export const MONTH_LABELS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];
export const MONTH_SHORT_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function formatDayHeading(dateISO: string): string {
  const d = fromISODate(dateISO);
  return `${WEEKDAY_LABELS_NL[d.getDay()]} ${d.getDate()} ${MONTH_LABELS_NL[d.getMonth()]}`;
}

export function formatShortDate(dateISO: string): string {
  const d = fromISODate(dateISO);
  return `${d.getDate()} ${MONTH_SHORT_NL[d.getMonth()]}`;
}

export function addDays(dateISO: string, days: number): string {
  const d = fromISODate(dateISO);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "Vandaag", "Gisteren", "Morgen" or the full day heading. */
export function relativeDayLabel(dateISO: string): string {
  const today = todayISO();
  if (dateISO === today) return 'Vandaag';
  if (dateISO === addDays(today, -1)) return 'Gisteren';
  if (dateISO === addDays(today, 1)) return 'Morgen';
  return formatDayHeading(dateISO);
}

export function startOfWeek(dateISO: string, weekStart: 'monday' | 'sunday' = 'monday'): string {
  const d = fromISODate(dateISO);
  const day = d.getDay(); // 0 sun .. 6 sat
  const offset = weekStart === 'monday' ? (day === 0 ? 6 : day - 1) : day;
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Parses Dutch-style input: "1.200,50", "12,5", "12.50" and "1200" all work. */
export function parseAmount(v: string): number {
  let t = v.trim().replace(/[^0-9.,-]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if ((t.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export function formatAmountInput(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

/** The most recent moment (at or before `now`) the clock showed `time` — today, or yesterday if that's still ahead. */
export function resolveStartMs(time: string, now = Date.now()): number {
  if (!time) return now;
  const ms = dateTimeToMs(toISODate(new Date(now)), time);
  return ms > now ? ms - 24 * 3600 * 1000 : ms;
}

/** "Nieuwe laptop" → "nieuwe laptop", "Reis Japan" → "reis Japan" — for use mid-sentence. */
export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
