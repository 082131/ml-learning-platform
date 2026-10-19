import { useMediaQuery } from '@/components/ui';

/** True when the learner asked for less motion. Animated visualizations jump straight to the end state. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
