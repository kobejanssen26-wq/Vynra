import type { SessionKind } from '../types';

export const KIND_META: Record<SessionKind, { label: string; color: string }> = {
  worked: { label: 'Gewerkt', color: 'var(--color-neon)' },
  manual: { label: 'Handmatig', color: 'var(--color-warn)' },
  planned: { label: 'Gepland', color: 'var(--color-info)' },
};
