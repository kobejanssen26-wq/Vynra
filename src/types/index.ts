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
  archived?: boolean; // deleted by the user but kept so past sessions keep their job
};

export type SessionKind = 'worked' | 'planned' | 'manual';

export type Session = {
  id: string;
  jobId: string;
  rateId: string | null; // null = base rate, else RateRule id
  rate?: number; // hourly rate snapshot at the time the session was saved
  date: string; // YYYY-MM-DD (local date of session start)
  startTime: string; // HH:mm or HH:mm:ss
  endTime: string; // HH:mm or HH:mm:ss
  breakMinutes: number; // may be fractional for live sessions
  note?: string;
  kind: SessionKind;
  createdAt: number;
  updatedAt: number;
};

export type ActiveSession = {
  jobId: string;
  rateId: string | null;
  sessionStart: number; // epoch ms of the (possibly corrected) start
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

export type Rounding = 'none' | 'min1' | 'min5' | 'min15';

export type Settings = {
  currency: string;
  currencySymbol: string;
  defaultRate: number;
  rounding: Rounding;
  weekStart: 'monday' | 'sunday';
  timezone: string;
  notifications: boolean;
  theme: 'dark' | 'light';
  language: 'nl' | 'en';
  showMilestone: boolean;
  milestoneStep: number;
  profileName: string;
  onboarded: boolean;
};
