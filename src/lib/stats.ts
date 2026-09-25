import type { ActiveSession, Goal, Job, Session } from '../types';
import { MONTH_SHORT_NL, addDays, effectiveRate, moneyFromSeconds, sessionEarnings, sessionMinutes, startOfWeek, todayISO } from './calc';

export function jobById(jobs: Job[], id: string): Job | undefined {
  return jobs.find((j) => j.id === id);
}

export function visibleJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => !j.archived);
}

export function filterByRange(sessions: Session[], from: string, to: string): Session[] {
  return sessions.filter((s) => s.date >= from && s.date <= to);
}

/** Sessions that actually happened (live + manually added/adjusted). Planned days never count as earned. */
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
  return { from, to: addDays(from, 6) };
}

export function monthRange(year: number, monthIndex: number) {
  const m = (monthIndex + 1).toString().padStart(2, '0');
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return { from: `${year}-${m}-01`, to: `${year}-${m}-${lastDay.toString().padStart(2, '0')}` };
}

export function currentMonthRange() {
  const d = new Date();
  return monthRange(d.getFullYear(), d.getMonth());
}

export function daysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function earningsByDay(sessions: Session[], jobs: Job[], days: string[]) {
  return days.map((date) => {
    const daySessions = sessions.filter((s) => s.date === date);
    return { date, amount: totalEarnings(daySessions, jobs), minutes: totalMinutes(daySessions) };
  });
}

export function earningsByJob(sessions: Session[], jobs: Job[]) {
  return jobs
    .map((job) => {
      const jobSessions = sessions.filter((s) => s.jobId === job.id);
      const amount = totalEarnings(jobSessions, jobs);
      const minutes = totalMinutes(jobSessions);
      return { job, amount, minutes, perHour: minutes > 0 ? amount / (minutes / 60) : 0, count: jobSessions.length };
    })
    .filter((e) => e.minutes > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function averageHourlyValue(sessions: Session[], jobs: Job[]): number {
  const minutes = totalMinutes(sessions);
  if (minutes === 0) return 0;
  return totalEarnings(sessions, jobs) / (minutes / 60);
}

export function weekOverWeek(sessions: Session[], jobs: Job[], weekStart: 'monday' | 'sunday' = 'monday') {
  const thisFrom = startOfWeek(todayISO(), weekStart);
  const lastFrom = addDays(thisFrom, -7);
  const current = totalEarnings(filterByRange(sessions, thisFrom, addDays(thisFrom, 6)), jobs);
  const previous = totalEarnings(filterByRange(sessions, lastFrom, addDays(thisFrom, -1)), jobs);
  return { current, previous };
}

export function monthlyEarnings(sessions: Session[], jobs: Job[], monthsBack = 6) {
  const today = new Date();
  const out: { label: string; amount: number; minutes: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const { from, to } = monthRange(d.getFullYear(), d.getMonth());
    const inMonth = filterByRange(sessions, from, to);
    out.push({ label: MONTH_SHORT_NL[d.getMonth()], amount: totalEarnings(inMonth, jobs), minutes: totalMinutes(inMonth) });
  }
  return out;
}

export function bestEarningDay(sessions: Session[], jobs: Job[]): { date: string; amount: number } | null {
  const map = new Map<string, number>();
  for (const s of sessions) map.set(s.date, (map.get(s.date) ?? 0) + totalEarnings([s], jobs));
  let best: { date: string; amount: number } | null = null;
  for (const [date, amount] of map.entries()) if (!best || amount > best.amount) best = { date, amount };
  return best;
}

/* ------------------------------------------------------------------ */
/* Live session                                                        */
/* ------------------------------------------------------------------ */

export function activeWorkedSeconds(active: ActiveSession, now = Date.now()): number {
  const running = active.isPaused ? 0 : Math.max(0, now - active.segmentStart);
  return Math.max(0, (active.accumulatedMs + running) / 1000);
}

export function activeEarnings(active: ActiveSession, jobs: Job[], now = Date.now()): number {
  return moneyFromSeconds(activeWorkedSeconds(active, now), effectiveRate(jobById(jobs, active.jobId), active.rateId));
}

/* ------------------------------------------------------------------ */
/* Goals & Money Journey                                               */
/* ------------------------------------------------------------------ */

export function goalShare(goal: Goal): number {
  return Math.max(0, Math.min(100, goal.allocationPercent ?? 0)) / 100;
}

/** The goal the Money Journey follows: the one receiving the biggest share of earnings, else the first. */
export function journeyGoal(goals: Goal[]): Goal | undefined {
  const open = goals.filter((g) => g.currentAmount < g.targetAmount);
  const pool = open.length ? open : goals;
  return pool.slice().sort((a, b) => goalShare(b) - goalShare(a))[0];
}

/**
 * Translates a goal into hours of work at `rate`.
 * With an allocation %, live earnings flow into the goal at that share, so the hours reflect it.
 * Without one, the hours are the plain value-of-time equivalent.
 */
export function goalJourney(goal: Goal, rate: number, liveEarned = 0) {
  const share = goalShare(goal);
  const saved = Math.min(goal.targetAmount, goal.currentAmount + liveEarned * share);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const effective = rate * (share || 1);
  return {
    share,
    saved,
    remaining,
    progress: goal.targetAmount > 0 ? (saved / goal.targetAmount) * 100 : 0,
    totalHours: rate > 0 ? goal.targetAmount / rate : 0,
    remainingHours: effective > 0 ? remaining / effective : 0,
  };
}
