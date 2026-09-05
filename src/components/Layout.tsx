import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Topbar from './Topbar';
import SessionModal from './SessionModal';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/kalender': 'Kalender',
  '/jobs': 'Mijn jobs',
  '/statistieken': 'Statistieken',
  '/geschiedenis': 'Geschiedenis',
  '/spaardoelen': 'Spaardoelen',
  '/instellingen': 'Instellingen',
};

export default function Layout() {
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Topbar onNewSession={() => setSessionModalOpen(true)} title={TITLES[location.pathname]} />
        <main className="px-4 sm:px-6 py-6 pb-28 lg:pb-10 max-w-[1400px] mx-auto">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <SessionModal open={sessionModalOpen} onClose={() => setSessionModalOpen(false)} />
    </div>
  );
}
