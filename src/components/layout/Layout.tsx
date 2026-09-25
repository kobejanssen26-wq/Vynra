import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Topbar from './Topbar';
import { PAGE_TITLES } from './nav';
import SessionModal from '../SessionModal';
import QuickStartModal from '../QuickStartModal';
import ForgottenStartModal from '../dashboard/ForgottenStartModal';
import { useUI } from '../../store/useUI';

export default function Layout() {
  const location = useLocation();
  const { sessionModal, closeSession, forgot, closeForgot } = useUI();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Topbar title={PAGE_TITLES[location.pathname]} />
        <main className="mx-auto max-w-[1400px] px-4 pb-32 pt-6 sm:px-6 lg:pb-12 lg:pt-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <BottomNav />
      <QuickStartModal />
      <SessionModal
        open={sessionModal.open}
        onClose={closeSession}
        editSession={sessionModal.editSession}
        defaultDate={sessionModal.defaultDate}
        defaultKind={sessionModal.defaultKind}
      />
      <ForgottenStartModal open={forgot.open} onClose={closeForgot} prefill={forgot.prefill} />
    </div>
  );
}
