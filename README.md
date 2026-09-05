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

- Live earnings tracker with start/pause/stop, per-second updates
- Jobs with custom hourly rates and special rate rules (holiday, weekend, evening, ...)
- Calendar with worked / planned / manually adjusted days
- Manual session entry for forgotten clock-ins and full missed days
- History with filters, Statistics with interactive charts
- Savings goals with a live "Money Journey" (hours → goal) and an optional in-session "next milestone" nudge
- Fully responsive: desktop sidebar, mobile bottom navigation

All data is stored locally in the browser (`localStorage`) — nothing leaves the device.
