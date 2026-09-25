# VYNRA — Turn time into more.

A premium, dark-mode time-to-money tracking app. Track your work, watch what you earn tick up live, and turn your hours into savings goals.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Zustand (state, persisted to `localStorage`)
- Framer Motion (micro-interactions)
- Recharts (statistics)
- React Router

## Getting started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Features

- **Live earnings** — pick a job and rate, press Start and watch the amount tick up every second
  (`earnings = worked seconds / 3600 × hourly rate`, pauses excluded). Stop asks for confirmation and
  saves the session to the second, so it earns exactly what the counter showed.
- **Forgotten start** — correct a late Start (backdate the running timer), or log a session that already
  ended. A planned shift that started without a timer triggers a gentle nudge.
- **Jobs & special rates** — your own rules like "Feestdag +€2/u"; you choose the active rate per session.
  VYNRA makes no legal assumptions about holidays or surcharges.
- **Calendar** — worked / planned / manually adjusted / no data, day and month totals, plan future days.
  Planned (*verwacht*) money never counts as earned (*verdiend*).
- **Manual sessions & editing** — every session is editable with a before/after preview and effective hourly
  rate, using the same calculation as live sessions. Each session stores its rate, so changing a job later
  never rewrites history.
- **History** with job/date/type filters; **Statistics** with interactive charts (per day, per job,
  week-over-week, monthly, best day, most worked job).
- **Savings goals** with optional auto-allocation, the **Money Journey** (goal → work hours, live while you
  work), **Wat is mijn tijd waard?** and an optional **Next milestone** ring.
- Search, notifications, CSV/JSON export, dark/light theme, time rounding, demo data.
- Desktop sidebar; mobile bottom navigation with a central Start/live button.

All data is stored locally in the browser (`localStorage`) — nothing leaves the device.
