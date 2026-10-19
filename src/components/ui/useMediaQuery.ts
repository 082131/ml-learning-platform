import { useSyncExternalStore } from 'react';

/** True while the media query matches. False where matchMedia is unavailable (tests, old browsers). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia?.(query);
      media?.addEventListener('change', onChange);
      return () => media?.removeEventListener('change', onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

/** Below this width the explanation panel becomes a bottom sheet (plan.md, decision 7). */
export const PHONE_QUERY = '(max-width: 899px)';
