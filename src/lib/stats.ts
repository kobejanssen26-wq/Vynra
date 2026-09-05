import type { Job, Session } from '../types';
import { addDays, sessionEarnings, sessionMinutes, startOfWeek, todayISO } from './calc';

export function jobById(jobs: Job[], id: string): Job | undefined {
  return jobs.find((j) => j.id === id);
}

export function filterByRange(sessions: Session[], from: string, to: string): Session[] {
  return sessions.filter((s) => s.date >= from && s.date <= to);
}

export function workedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.kind === 'worked' || s.kind === 'manual');
}

export function plannedSessions(sessions: Session[]): Session[] {
  return sessions.filter((s) => s.kind === 'planned');
}

export function totalEarnings(sessions: Session[], jobs: Job[]): number {
  return sessions.reduce((sum, s) => sum + sessionEarnings(s, jobById(jobs, s.jobId)), 0);
}

export function totalMinutes(sessions: Session[]): number {
  return sessions.reduce((sum, s) => sum + sessionMinutes(s), 0);
}

export function currentWeekRange(weekStart: 'monday' | 'sunday' = 'monday') {
  const from = startOfWeek(todayISO(), weekStart);
  const to = addDays(from, 6);
  return { from, to };
}

export function currentMonthRange() {
  const today = todayISO();
  const [y, m] = today.split('-').map(Number);
  const from = `${y}-${m.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${m.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  return { from, to };
}

export function earningsByDay(sessions: Session[], jobs: Job[], days: string[]): { date: string; amount: number; minutes: number }[] {
  return days.map((date) => {
    const daySessions = sessions.filter((s) => s.date === date);
    return {
      date,
      amount: totalEarnings(daySessions, jobs),
      minutes: totalMinutes(daySessions),
    };
  });
}

export function earningsByJob(sessions: Session[], jobs: Job[]): { job: Job; amount: number; minutes: number }[] {
  return jobs
    .map((job) => {
      const jobSessions = sessions.filter((s) => s.jobId === job.id);
      return { job, amount: totalEarnings(jobSessions, jobs), minutes: totalMinutes(jobSessions) };
    })
    .filter((e) => e.minutes > 0);
}

export function averageHourlyValue(sessions: Session[], jobs: Job[]): number {
  const minutes = totalMinutes(sessions);
  if (minutes === 0) return 0;
  const earnings = totalEarnings(sessions, jobs);
  return Math.round((earnings / (minutes / 60)) * 100) / 100;
}

export function lastNDays(n: number, endISO = todayISO()): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) days.push(addDays(endISO, -i));
  return days;
}

export function weekDays(fromISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(fromISO, i));
}

export function weekOverWeek(sessions: Session[], jobs: Job[], weekStart: 'monday' | 'sunday' = 'monday') {
  const thisWeekFrom = startOfWeek(todayISO(), weekStart);
  const thisWeekTo = addDays(thisWeekFrom, 6);
  const lastWeekFrom = addDays(thisWeekFrom, -7);
  const lastWeekTo = addDays(thisWeekFrom, -1);
  const thisWeek = totalEarnings(filterByRange(sessions, thisWeekFrom, thisWeekTo), jobs);
  const lastWeek = totalEarnings(filterByRange(sessions, lastWeekFrom, lastWeekTo), jobs);
  return [
    { label: 'Vorige week', amount: lastWeek },
    { label: 'Deze week', amount: thisWeek },
  ];
}

export function monthlyEarnings(sessions: Session[], jobs: Job[], monthsBack = 6) {
  const today = new Date();
  const out: { label: string; amount: number }[] = [];
  const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const from = `${y}-${(m + 1).toString().padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${(m + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    out.push({ label: MONTH_SHORT[m], amount: totalEarnings(filterByRange(sessions, from, to), jobs) });
  }
  return out;
}

export function bestEarningDay(sessions: Session[], jobs: Job[]): { date: string; amount: number } | null {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const amount = totalEarnings([s], jobs);
    map.set(s.date, (map.get(s.date) ?? 0) + amount);
  }
  let best: { date: string; amount: number } | null = null;
  for (const [date, amount] of map.entries()) {
    if (!best || amount > best.amount) best = { date, amount };
  }
  return best;
}
