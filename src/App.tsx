import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import CalendarPage from './pages/Calendar';
import Statistics from './pages/Statistics';
import HistoryPage from './pages/History';
import Goals from './pages/Goals';
import SettingsPage from './pages/Settings';
import { useStore } from './store/useStore';

export default function App() {
  const onboarded = useStore((s) => s.settings.onboarded);
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
        <Route path="/statistieken" element={<Statistics />} />
        <Route path="/geschiedenis" element={<HistoryPage />} />
        <Route path="/spaardoelen" element={<Goals />} />
        <Route path="/instellingen" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
