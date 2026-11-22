import { useState } from 'react';
import { NavLink } from 'react-router';
import { curriculum } from '@/app/content';
import { Button, Sheet } from '@/components/ui';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import s from './TopNav.module.css';

const TRACK_CHIP: Record<string, string> = {
  ml: 'ML',
  data: 'Data',
  ai: 'AI',
  inference: 'Inference',
  python: 'Python',
  dataops: 'DataOps',
  deploy: 'Deploy',
  git: 'Git',
};
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

interface NavItem {
  to: string;
  label: string;
  /** Full name, shown in the phone menu and as a hover title. */
  title?: string;
  end?: boolean;
}

const LINKS: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  ...curriculum.tracks.map((t) => ({
    to: `/learn/${t.id}`,
    label: TRACK_CHIP[t.id] ?? t.id,
    title: t.title,
  })),
];
const UTIL_LINKS: NavItem[] = [
  { to: '/interview', label: 'Interview', title: 'Interview prep' },
  { to: '/glossary', label: 'Glossary' },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/settings', label: 'Settings' },
];

function Chips({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  return (
    <ul className={vertical ? s.chipsVertical : s.chips}>
      {[...LINKS, ...UTIL_LINKS].map((l) => (
        <li key={l.to}>
          <NavLink to={l.to} end={l.end} className={s.chip} title={l.title} onClick={onNavigate}>
            {vertical ? (l.title ?? l.label) : l.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function TopNav({ onSearch }: { onSearch: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className={s.bar}>
      <Logo />
      <nav aria-label="Main" className={s.desktopOnly}>
        <Chips />
      </nav>
      <div className={s.actions}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSearch}
          aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
        >
          Search <kbd className={s.kbd}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </Button>
        <span className={s.desktopOnly}>
          <ThemeToggle />
        </span>
        <Button
          variant="secondary"
          size="sm"
          className={s.mobileOnly}
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
        >
          Menu
        </Button>
      </div>
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" side="left">
        <nav aria-label="Main">
          <Chips vertical onNavigate={() => setMenuOpen(false)} />
        </nav>
        <div className={s.menuTheme}>
          <ThemeToggle />
        </div>
      </Sheet>
    </header>
  );
}
