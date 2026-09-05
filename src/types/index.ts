export type RateRule = {
  id: string;
  label: string;
  delta: number; // amount added per hour on top of base rate, can be negative
};

export type Job = {
  id: string;
  name: string;
  icon: string; // emoji
  baseRate: number; // per hour
  color: string; // accent hex for charts
  rateRules: RateRule[];
  archived?: boolean;
};

export type Session = {
  id: string;
  jobId: string;
  rateId: string | null; // null = base rate, else RateRule id
  date: string; // YYYY-MM-DD (local date of session start)
  startTime: string; // HH:mm
  endTime: string; // HH:mm, undefined-safe: '' means still running (only for active session, not stored)
  breakMinutes: number;
  note?: string;
  kind: 'worked' | 'planned' | 'manual';
  createdAt: number;
  updatedAt: number;
};

export type ActiveSession = {
  jobId: string;
  rateId: string | null;
  sessionStart: number; // epoch ms, fixed at the moment Start was pressed
  segmentStart: number; // epoch ms, reset every time the session (re)starts running
  accumulatedMs: number; // worked ms accumulated from completed running segments
  isPaused: boolean;
  pausedAt: number | null; // epoch ms when paused
  note?: string;
};

export type Goal = {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  currentAmount: number;
  allocationPercent?: number; // optional % of new earnings auto-allocated
  createdAt: number;
};

export type Settings = {
  currency: string;
  currencySymbol: string;
  defaultRate: number;
  rounding: 'none' | 'nearest5' | 'nearest15';
  weekStart: 'monday' | 'sunday';
  timezone: string;
  notifications: boolean;
  theme: 'dark' | 'light';
  language: 'nl' | 'en';
  showMilestone: boolean;
  onboarded: boolean;
};
