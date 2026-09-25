import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import CalendarPage from './pages/Calendar';
import HistoryPage from './pages/History';
import Goals from './pages/Goals';
import SettingsPage from './pages/Settings';
import { useStore } from './store/useStore';

// Charts are the heaviest dependency; load them only when the statistics page is opened.
const Statistics = lazy(() => import('./pages/Statistics'));

export default function App() {
  const onboarded = useStore((s) => s.settings.onboarded);
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#05070a' : '#f4f6f5');
  }, [theme]);

  if (!onboarded) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/kalender" element={<CalendarPage />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route
          path="/statistieken"
          element={
            <Suspense fallback={<div className="h-[60vh]" />}>
              <Statistics />
            </Suspense>
          }
        />
        <Route path="/geschiedenis" element={<HistoryPage />} />
        <Route path="/spaardoelen" element={<Goals />} />
        <Route path="/instellingen" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
