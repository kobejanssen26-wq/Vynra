import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActiveSession, Goal, Job, Session, Settings } from '../types';
import { addDays, sessionEarnings, todayISO, uid } from '../lib/calc';

type State = {
  jobs: Job[];
  sessions: Session[];
  goals: Goal[];
  settings: Settings;
  active: ActiveSession | null;
  hydrated: boolean;

  // jobs
  addJob: (job: Omit<Job, 'id'>) => string;
  updateJob: (id: string, patch: Partial<Job>) => void;
  deleteJob: (id: string) => void;

  // sessions
  addManualSession: (session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSession: (id: string, patch: Partial<Session>) => void;
  deleteSession: (id: string) => void;

  // active session lifecycle
  startSession: (jobId: string, rateId: string | null) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: (note?: string) => void;
  discardActiveSession: () => void;

  // goals
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => string;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  resetAllData: () => void;
};

const defaultSettings: Settings = {
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
  onboarded: false,
};

function demoJobs(): Job[] {
  return [
    {
      id: 'job-cafe',
      name: 'Café',
      icon: '☕',
      baseRate: 12,
      color: '#39FFB0',
      rateRules: [
        { id: 'r1', label: 'Feestdag', delta: 2 },
        { id: 'r2', label: 'Zondag', delta: 1.5 },
        { id: 'r3', label: 'Avond', delta: 1 },
      ],
    },
    {
      id: 'job-thuiswerk',
      name: 'Thuiswerk',
      icon: '🏠',
      baseRate: 7.5,
      color: '#2FD9E8',
      rateRules: [],
    },
    {
      id: 'job-oppassen',
      name: 'Oppassen',
      icon: '👶',
      baseRate: 9,
      color: '#B18CFF',
      rateRules: [],
    },
    {
      id: 'job-training',
      name: 'Training geven',
      icon: '🏋️',
      baseRate: 15,
      color: '#FFC15E',
      rateRules: [],
    },
  ];
}

function demoSessions(): Session[] {
  const today = todayISO();
  const y1 = addDays(today, -1);
  const y2 = addDays(today, -2);
  const y4 = addDays(today, -4);
  const tomorrow = addDays(today, 1);
  const in4 = addDays(today, 4);
  const now = Date.now();
  return [
    { id: uid(), jobId: 'job-cafe', rateId: null, date: today, startTime: '09:00', endTime: '12:30', breakMinutes: 15, kind: 'worked', createdAt: now, updatedAt: now },
    { id: uid(), jobId: 'job-thuiswerk', rateId: null, date: y1, startTime: '10:15', endTime: '11:40', breakMinutes: 0, kind: 'worked', createdAt: now, updatedAt: now },
    { id: uid(), jobId: 'job-training', rateId: null, date: y1, startTime: '18:10', endTime: '20:05', breakMinutes: 0, kind: 'worked', createdAt: now, updatedAt: now },
    { id: uid(), jobId: 'job-cafe', rateId: 'r3', date: y2, startTime: '17:00', endTime: '21:30', breakMinutes: 20, kind: 'worked', createdAt: now, updatedAt: now },
    { id: uid(), jobId: 'job-oppassen', rateId: null, date: y4, startTime: '13:00', endTime: '17:00', breakMinutes: 0, kind: 'manual', note: 'Vergeten in te klokken', createdAt: now, updatedAt: now },
    { id: uid(), jobId: 'job-cafe', rateId: null, date: tomorrow, startTime: '13:00', endTime: '18:00', breakMinutes: 30, kind: 'planned', createdAt: now, updatedAt: now },
    { id: uid(), jobId: 'job-training', rateId: null, date: in4, startTime: '19:00', endTime: '20:30', breakMinutes: 0, kind: 'planned', createdAt: now, updatedAt: now },
  ];
}

function demoGoals(): Goal[] {
  return [
    { id: uid(), name: 'Nieuwe laptop', icon: '💻', targetAmount: 1200, currentAmount: 620, allocationPercent: 15, createdAt: Date.now() },
    { id: uid(), name: 'Reis Japan', icon: '✈️', targetAmount: 2000, currentAmount: 248, allocationPercent: 10, createdAt: Date.now() },
  ];
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      jobs: [],
      sessions: [],
      goals: [],
      settings: defaultSettings,
      active: null,
      hydrated: false,

      addJob: (job) => {
        const id = uid();
        set((s) => ({ jobs: [...s.jobs, { ...job, id }] }));
        return id;
      },
      updateJob: (id, patch) =>
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      deleteJob: (id) =>
        set((s) => ({
          jobs: s.jobs.filter((j) => j.id !== id),
          sessions: s.sessions.filter((sess) => sess.jobId !== id),
        })),

      addManualSession: (session) => {
        const id = uid();
        const now = Date.now();
        set((s) => ({ sessions: [...s.sessions, { ...session, id, createdAt: now, updatedAt: now }] }));
        return id;
      },
      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...patch, updatedAt: Date.now() } : sess)),
        })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== id) })),

      startSession: (jobId, rateId) =>
        set({
          active: {
            jobId,
            rateId,
            sessionStart: Date.now(),
            segmentStart: Date.now(),
            accumulatedMs: 0,
            isPaused: false,
            pausedAt: null,
          },
        }),

      pauseSession: () =>
        set((s) => {
          if (!s.active || s.active.isPaused) return s;
          const elapsed = Date.now() - s.active.segmentStart;
          return {
            active: {
              ...s.active,
              accumulatedMs: s.active.accumulatedMs + elapsed,
              isPaused: true,
              pausedAt: Date.now(),
            },
          };
        }),

      resumeSession: () =>
        set((s) => {
          if (!s.active || !s.active.isPaused) return s;
          return {
            active: {
              ...s.active,
              segmentStart: Date.now(),
              isPaused: false,
              pausedAt: null,
            },
          };
        }),

      stopSession: (note) => {
        const s = get();
        if (!s.active) return;
        const workedMs = s.active.accumulatedMs + (s.active.isPaused ? 0 : Date.now() - s.active.segmentStart);
        const wallClockMs = Math.max(workedMs, Date.now() - s.active.sessionStart);
        const breakMinutes = Math.max(0, Math.round((wallClockMs - workedMs) / 60000));

        const startDate = new Date(s.active.sessionStart);
        const realEnd = new Date(Date.now());
        const pad = (n: number) => n.toString().padStart(2, '0');
        const dateISO = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())}`;
        const startTime = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
        const endTime = `${pad(realEnd.getHours())}:${pad(realEnd.getMinutes())}`;

        const id = uid();
        const now = Date.now();
        const newSession: Session = {
          id,
          jobId: s.active.jobId,
          rateId: s.active.rateId,
          date: dateISO,
          startTime,
          endTime,
          breakMinutes,
          kind: 'worked',
          note,
          createdAt: now,
          updatedAt: now,
        };

        // auto-allocate to goals
        const job = s.jobs.find((j) => j.id === s.active!.jobId);
        const earned = sessionEarnings(newSession, job);
        let goals = s.goals;
        if (earned > 0) {
          goals = s.goals.map((g) => {
            if (!g.allocationPercent) return g;
            const add = Math.round(earned * (g.allocationPercent / 100) * 100) / 100;
            return { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + add) };
          });
        }

        set({ sessions: [...s.sessions, newSession], active: null, goals });
      },

      discardActiveSession: () => set({ active: null }),

      addGoal: (goal) => {
        const id = uid();
        set((s) => ({ goals: [...s.goals, { ...goal, id, createdAt: Date.now() }] }));
        return id;
      },
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetAllData: () =>
        set({
          jobs: demoJobs(),
          sessions: demoSessions(),
          goals: demoGoals(),
          settings: defaultSettings,
          active: null,
        }),
    }),
    {
      name: 'vynra-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          if (state.jobs.length === 0 && state.sessions.length === 0 && !state.settings?.onboarded) {
            // leave empty for fresh onboarding; demo data only via explicit seed
          }
        }
      },
    }
  )
);

export function seedDemoData() {
  useStore.setState({ jobs: demoJobs(), sessions: demoSessions(), goals: demoGoals() });
}
