import { BarChart3, Briefcase, CalendarDays, History, LayoutGrid, Settings, Target } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: LayoutGrid, end: true },
  { to: '/kalender', label: 'Kalender', short: 'Kalender', icon: CalendarDays },
  { to: '/jobs', label: 'Mijn jobs', short: 'Jobs', icon: Briefcase },
  { to: '/statistieken', label: 'Statistieken', short: 'Stats', icon: BarChart3 },
  { to: '/geschiedenis', label: 'Geschiedenis', short: 'Historie', icon: History },
  { to: '/spaardoelen', label: 'Spaardoelen', short: 'Doelen', icon: Target },
  { to: '/instellingen', label: 'Instellingen', short: 'Instellingen', icon: Settings },
] as const;

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(NAV_ITEMS.map((n) => [n.to, n.label]));
