import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveSession, Goal, Job, Session, Settings } from '../types';
import { addDays, effectiveRate, grossDurationSeconds, moneyFromSeconds, roundCents, sessionEarnings, setRounding, timeOf, toISODate, todayISO, uid } from '../lib/calc';
import { jobById } from '../lib/stats';

/** Validated categorical palette for jobs (fixed order, colour-blind safe on the dark surface). */
export const JOB_COLORS = ['#199e70', '#3987e5', '#c98500', '#d55181', '#9085e9', '#d95926'];

type NewSession = Omit<Session, 'id' | 'createdAt' | 'updatedAt'>;

type State = {
  jobs: Job[];
  sessions: Session[];
  goals: Goal[];
  settings: Settings;
  active: ActiveSession | null;

  addJob: (job: Omit<Job, 'id'>) => string;
  updateJob: (id: string, patch: Partial<Job>) => void;
  deleteJob: (id: string) => void;

  addSession: (session: NewSession) => string;
  updateSession: (id: string, patch: Partial<Session>) => void;
  deleteSession: (id: string) => void;

  startSession: (jobId: string, rateId: string | null, startAt?: number) => void;
  adjustActiveStart: (startAt: number) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: (note?: string) => Session | null;
  discardActiveSession: () => void;

  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  loadDemoData: () => void;
  clearAllData: () => void;
};

export const defaultSettings: Settings = {
  currency: 'EUR',
  currencySymbol: '€',
  defaultRate: 12,
  rounding: 'none',
  weekStart: 'monday',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Europe/Amsterdam',
  notifications: true,
  theme: 'dark',
  language: 'nl',
  showMilestone: true,
  milestoneStep: 10,
  profileName: '',
  onboarded: false,
};

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */

function demoJobs(): Job[] {
  return [
    {
      id: 'job-cafe',
      name: 'Café',
      icon: '☕',
      baseRate: 12,
      color: JOB_COLORS[0],
      rateRules: [
        { id: 'r-feestdag', label: 'Feestdag', delta: 2 },
        { id: 'r-zondag', label: 'Zondag', delta: 1.5 },
        { id: 'r-avond', label: 'Avond', delta: 1 },
      ],
    },
    { id: 'job-thuiswerk', name: 'Thuiswerk', icon: '🏠', baseRate: 7.5, color: JOB_COLORS[1], rateRules: [] },
    { id: 'job-oppassen', name: 'Oppassen', icon: '👶', baseRate: 9, color: JOB_COLORS[2], rateRules: [{ id: 'r-laat', label: 'Na middernacht', delta: 1.5 }] },
    { id: 'job-training', name: 'Training geven', icon: '🏋️', baseRate: 15, color: JOB_COLORS[3], rateRules: [] },
  ];
}

function demoSessions(jobs: Job[]): Session[] {
  // Deterministic pseudo-random so the demo looks the same on every reset.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const today = todayISO();
  const now = Date.now();
  const out: Session[] = [];
  const push = (jobId: string, date: string, start: string, end: string, breakMinutes: number, kind: Session['kind'], rateId: string | null = null, note?: string) => {
    const rate = effectiveRate(jobById(jobs, jobId), rateId);
    out.push({ id: uid(), jobId, rateId, rate, date, startTime: start, endTime: end, breakMinutes, kind, note, createdAt: now, updatedAt: now });
  };

  for (let back = 170; back >= 1; back--) {
    const date = addDays(today, -back);
    const dow = new Date(date + 'T00:00:00').getDay();
    if (dow === 3 || dow === 6 || dow === 0) {
      // café shifts: wed afternoon, saturday, sunday
      if (rand() > 0.2) {
        const start = dow === 3 ? '13:30' : rand() > 0.5 ? '10:00' : '12:00';
        const endH = 16 + Math.floor(rand() * 3);
        const end = `${endH}:${rand() > 0.5 ? '45' : '15'}`;
        push('job-cafe', date, start, end, 30, back % 11 === 0 ? 'manual' : 'worked', dow === 0 ? 'r-zondag' : null, back % 11 === 0 ? 'Vergeten in te klokken' : undefined);
      }
    }
    if ((dow === 1 || dow === 4) && rand() > 0.25) {
      push('job-thuiswerk', date, '10:15', rand() > 0.5 ? '11:40' : '12:20', 0, 'worked');
    }
    if (dow === 2 && rand() > 0.15) push('job-training', date, '18:10', '20:05', 0, 'worked');
    if (dow === 5 && rand() > 0.5) push('job-oppassen', date, '19:00', '23:30', 0, 'worked');
  }

  push('job-thuiswerk', today, '09:10', '10:32:40', 0, 'worked');
  push('job-cafe', addDays(today, 1), '13:00', '18:00', 0, 'planned');
  push('job-training', addDays(today, 3), '19:00', '20:30', 0, 'planned');
  push('job-cafe', addDays(today, 5), '12:00', '17:30', 30, 'planned', 'r-zondag');
  return out;
}

function demoGoals(): Goal[] {
  const t = Date.now();
  return [
    { id: uid(), name: 'Nieuwe laptop', icon: '💻', targetAmount: 1200, currentAmount: 620, allocationPercent: 50, createdAt: t },
    { id: uid(), name: 'Reis Japan', icon: '✈️', targetAmount: 2000, currentAmount: 248, allocationPercent: 20, createdAt: t + 1 },
    { id: uid(), name: 'Auto', icon: '🚗', targetAmount: 5000, currentAmount: 1450, createdAt: t + 2 },
  ];
}

/** A planned shift is fulfilled once real work for that job is logged on the same day. */
function withoutFulfilledPlan(sessions: Session[], done: Session): Session[] {
  if (done.kind === 'planned') return sessions;
  return sessions.filter((s) => !(s.kind === 'planned' && s.jobId === done.jobId && s.date === done.date));
}

/** Adds each goal's share of `amount` to it. Planned sessions never reach this. */
function allocate(goals: Goal[], amount: number): Goal[] {
  if (amount <= 0) return goals;
  return goals.map((g) => {
    if (!g.allocationPercent) return g;
    const add = roundCents(amount * (g.allocationPercent / 100));
    return { ...g, currentAmount: Math.min(g.targetAmount, roundCents(g.currentAmount + add)) };
  });
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      jobs: [],
      sessions: [],
      goals: [],
      settings: defaultSettings,
      active: null,

      addJob: (job) => {
        const id = uid();
        set((s) => ({ jobs: [...s.jobs, { ...job, id }] }));
        return id;
      },
      updateJob: (id, patch) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      deleteJob: (id) =>
        set((s) => {
          // Worked history stays intact: the job is archived instead of erased when it has past sessions.
          const sessions = s.sessions.filter((sess) => !(sess.jobId === id && sess.kind === 'planned'));
          const hasHistory = sessions.some((sess) => sess.jobId === id);
          return {
            sessions,
            jobs: hasHistory ? s.jobs.map((j) => (j.id === id ? { ...j, archived: true } : j)) : s.jobs.filter((j) => j.id !== id),
          };
        }),

      addSession: (session) => {
        const id = uid();
        const now = Date.now();
        const full: Session = { ...session, id, createdAt: now, updatedAt: now };
        set((s) => ({
          sessions: [...withoutFulfilledPlan(s.sessions, full), full],
          goals: full.kind === 'planned' ? s.goals : allocate(s.goals, sessionEarnings(full, jobById(s.jobs, full.jobId))),
        }));
        return id;
      },
      updateSession: (id, patch) =>
        set((s) => ({ sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...patch, updatedAt: Date.now() } : sess)) })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),

      startSession: (jobId, rateId, startAt) => {
        const now = Date.now();
        const start = Math.min(startAt ?? now, now);
        set({ active: { jobId, rateId, sessionStart: start, segmentStart: start, accumulatedMs: 0, isPaused: false, pausedAt: null } });
      },

      adjustActiveStart: (startAt) =>
        set((s) => {
          if (!s.active) return s;
          const now = Date.now();
          const start = Math.min(startAt, now);
          const delta = s.active.sessionStart - start; // > 0 means we started earlier than recorded
          if (s.active.isPaused) {
            return { active: { ...s.active, sessionStart: start, accumulatedMs: Math.max(0, s.active.accumulatedMs + delta) } };
          }
          return { active: { ...s.active, sessionStart: start, segmentStart: Math.min(now, s.active.segmentStart - delta) } };
        }),

      pauseSession: () =>
        set((s) => {
          if (!s.active || s.active.isPaused) return s;
          const now = Date.now();
          return { active: { ...s.active, accumulatedMs: s.active.accumulatedMs + (now - s.active.segmentStart), isPaused: true, pausedAt: now } };
        }),

      resumeSession: () =>
        set((s) => {
          if (!s.active || !s.active.isPaused) return s;
          return { active: { ...s.active, segmentStart: Date.now(), isPaused: false, pausedAt: null } };
        }),

      stopSession: (note) => {
        const s = get();
        const a = s.active;
        if (!a) return null;
        const now = Date.now();
        const workedMs = a.accumulatedMs + (a.isPaused ? 0 : now - a.segmentStart);
        const job = jobById(s.jobs, a.jobId);
        const rate = effectiveRate(job, a.rateId);
        const start = new Date(a.sessionStart);
        const startTime = timeOf(start, true);
        const endTime = timeOf(new Date(now), true);
        const workedSec = Math.floor(workedMs / 1000);
        const session: Session = {
          id: uid(),
          jobId: a.jobId,
          rateId: a.rateId,
          rate,
          date: toISODate(start),
          startTime,
          endTime,
          // Second precision so the stored session earns exactly what the live counter showed.
          breakMinutes: Math.max(0, grossDurationSeconds(startTime, endTime) - workedSec) / 60,
          kind: 'worked',
          note: note?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        set({
          sessions: [...withoutFulfilledPlan(s.sessions, session), session],
          active: null,
          goals: allocate(s.goals, moneyFromSeconds(workedSec, rate)),
        });
        return session;
      },

      discardActiveSession: () => set({ active: null }),

      addGoal: (goal) => {
        const id = uid();
        set((s) => ({ goals: [...s.goals, { ...goal, id, createdAt: Date.now() }] }));
        return id;
      },
      updateGoal: (id, patch) => set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      updateSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          setRounding(settings.rounding);
          return { settings };
        }),

      loadDemoData: () => {
        const jobs = demoJobs();
        set({ jobs, sessions: demoSessions(jobs), goals: demoGoals(), active: null });
      },

      clearAllData: () => {
        setRounding(defaultSettings.rounding);
        set({ jobs: [], sessions: [], goals: [], active: null, settings: { ...defaultSettings } });
      },
    }),
    {
      name: 'vynra-storage',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<State>;
        if (version < 2) {
          const oldColors = ['#39FFB0', '#2FD9E8', '#B18CFF', '#FFC15E', '#FF7E8A', '#6EA8FF'];
          const jobs = (state.jobs ?? []).map((j) => {
            const i = oldColors.indexOf(j.color);
            return { ...j, color: i >= 0 ? JOB_COLORS[i] : j.color };
          });
          state.jobs = jobs;
          state.sessions = (state.sessions ?? []).map((sess) => ({ ...sess, rate: sess.rate ?? effectiveRate(jobById(jobs, sess.jobId), sess.rateId) }));
          state.settings = { ...defaultSettings, ...state.settings, rounding: 'none' } as Settings;
        }
        return state as State;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...defaultSettings, ...p.settings } };
      },
      onRehydrateStorage: () => (state) => {
        if (state) setRounding(state.settings.rounding);
      },
    }
  )
);
