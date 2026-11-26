import { useState } from 'react';
import { NavLink } from 'react-router';
import { curriculum } from '@/app/content';
import { Button, Sheet } from '@/components/ui';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { TrackMenu } from './TrackMenu';
import { trackChip } from './trackChips';
import s from './TopNav.module.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

interface NavItem {
  to: string;
  label: string;
  /** Full name, shown in the phone menu and as a hover title. */
  title?: string;
  end?: boolean;
}

const HOME: NavItem = { to: '/', label: 'Home', end: true };
const TRACK_LINKS: NavItem[] = curriculum.tracks.map((t) => ({
  to: `/learn/${t.id}`,
  label: trackChip(t.id),
  title: t.title,
}));
const UTIL_LINKS: NavItem[] = [
  { to: '/interview', label: 'Interview', title: 'Interview prep' },
  { to: '/glossary', label: 'Glossary' },
  { to: '/bookmarks', label: 'Bookmarks' },
  { to: '/settings', label: 'Settings' },
];

function Chip({
  item,
  vertical,
  onNavigate,
}: {
  item: NavItem;
  vertical?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <NavLink to={item.to} end={item.end} className={s.chip} title={item.title} onClick={onNavigate}>
        {vertical ? (item.title ?? item.label) : item.label}
      </NavLink>
    </li>
  );
}

/** Desktop: Home, one Tracks menu, then the study tools. The bar keeps its width as tracks are added. */
function DesktopChips() {
  return (
    <ul className={s.chips}>
      <Chip item={HOME} />
      <li>
        <TrackMenu />
      </li>
      {UTIL_LINKS.map((l) => (
        <Chip key={l.to} item={l} />
      ))}
    </ul>
  );
}

/** Phone menu: every link with its full name, tracks grouped under a heading. */
function MenuChips({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <ul className={s.chipsVertical}>
        <Chip item={HOME} vertical onNavigate={onNavigate} />
      </ul>
      <h2 className={s.menuHeading}>Tracks</h2>
      <ul className={s.chipsVertical}>
        {TRACK_LINKS.map((l) => (
          <Chip key={l.to} item={l} vertical onNavigate={onNavigate} />
        ))}
      </ul>
      <h2 className={s.menuHeading}>Study tools</h2>
      <ul className={s.chipsVertical}>
        {UTIL_LINKS.map((l) => (
          <Chip key={l.to} item={l} vertical onNavigate={onNavigate} />
        ))}
      </ul>
    </>
  );
}

export function TopNav({ onSearch }: { onSearch: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className={s.bar}>
      <Logo />
      <nav aria-label="Main" className={s.desktopOnly}>
        <DesktopChips />
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
          <MenuChips onNavigate={() => setMenuOpen(false)} />
        </nav>
        <div className={s.menuTheme}>
          <ThemeToggle />
        </div>
      </Sheet>
    </header>
  );
}
