import type { RunPhase } from '@/lib/python/protocol';

export const PHASE_LABEL: Record<RunPhase, string> = {
  'loading-runtime': 'Loading Python',
  'loading-packages': 'Loading packages',
  running: 'Running',
};
