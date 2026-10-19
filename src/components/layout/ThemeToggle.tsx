import { useProgress, useProgressStore } from '@/app/progress';
import { Button, Tooltip } from '@/components/ui';
import { setTheme } from '@/lib/progress/actions';
import { nextTheme, THEME_LABEL } from '@/lib/theme';
import s from './ThemeToggle.module.css';

/** Cycles system → light → dark. The choice is stored with progress. */
export function ThemeToggle() {
  const { theme } = useProgress();
  const store = useProgressStore();
  const next = nextTheme(theme);
  return (
    <Tooltip content={`Switch to ${THEME_LABEL[next].toLowerCase()}`}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Theme: ${THEME_LABEL[theme]}. Switch to ${THEME_LABEL[next]}`}
        onClick={() => store.update((s) => setTheme(s, next))}
      >
        <span className={s.icon} aria-hidden="true" /> {THEME_LABEL[theme]}
      </Button>
    </Tooltip>
  );
}
