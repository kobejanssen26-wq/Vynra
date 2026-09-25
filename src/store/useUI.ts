import { create } from 'zustand';
import type { Session } from '../types';
import type { ForgotPrefill } from '../components/dashboard/ForgottenStartBanner';

type SessionModalState = {
  open: boolean;
  editSession?: Session | null;
  defaultDate?: string;
  defaultKind?: 'done' | 'planned';
};

type UIState = {
  sessionModal: SessionModalState;
  quickStartOpen: boolean;
  forgot: { open: boolean; prefill?: ForgotPrefill };
  openSession: (opts?: Omit<SessionModalState, 'open'>) => void;
  closeSession: () => void;
  setQuickStart: (open: boolean) => void;
  openForgot: (prefill?: ForgotPrefill) => void;
  closeForgot: () => void;
};

/** App-wide modals, so "Handmatig een sessie toevoegen" works the same from every page. */
export const useUI = create<UIState>()((set) => ({
  sessionModal: { open: false },
  quickStartOpen: false,
  forgot: { open: false },
  openSession: (opts) => set({ sessionModal: { open: true, ...opts } }),
  closeSession: () => set((s) => ({ sessionModal: { ...s.sessionModal, open: false } })),
  setQuickStart: (open) => set({ quickStartOpen: open }),
  openForgot: (prefill) => set({ forgot: { open: true, prefill } }),
  closeForgot: () => set((s) => ({ forgot: { ...s.forgot, open: false } })),
}));
