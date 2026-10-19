import { useEffect } from 'react';
import { resolveTheme } from '@/lib/theme';
import { useProgress } from './progress';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Applies the stored theme preference to <html data-theme>, following the system when set to 'system'. */
export function useApplyTheme() {
  const { theme } = useProgress();
  useEffect(() => {
    const media = window.matchMedia?.(DARK_QUERY);
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme, media?.matches ?? false);
    };
    apply();
    if (theme !== 'system' || !media) return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
