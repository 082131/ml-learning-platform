import type { ThemePreference } from './progress/schema';

export type ResolvedTheme = 'light' | 'dark';

export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

/** The toggle cycles system → light → dark → system. */
export function nextTheme(pref: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]!;
}

export const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};
