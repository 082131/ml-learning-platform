import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { curriculum } from '@/app/content';
import { trackChip } from './trackChips';
import s from './TopNav.module.css';

/**
 * The desktop "Tracks" menu: one button that opens a panel listing every track with its code and full title, so the
 * top bar stays the same width however many tracks the curriculum has. While a track page is open the button also
 * names that track. Escape, a click outside or choosing a track closes it.
 */
export function TrackMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { pathname } = useLocation();
  const current = curriculum.tracks.find(
    (t) => pathname === `/learn/${t.id}` || pathname.startsWith(`/learn/${t.id}/`),
  );

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  return (
    <div
      ref={root}
      className={s.menuRoot}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        className={s.chip}
        data-active={current ? 'true' : undefined}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        Tracks{current && <span className={s.menuCurrent}>: {trackChip(current.id)}</span>}
        <span aria-hidden="true" className={s.caret}>
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div id={id} className={s.menuPanel}>
          <ul className={s.menuList} aria-label="All tracks">
            {curriculum.tracks.map((t) => (
              <li key={t.id}>
                <NavLink to={`/learn/${t.id}`} className={s.menuLink} onClick={() => setOpen(false)}>
                  <span aria-hidden="true" className={s.menuCode}>
                    {t.code}
                  </span>
                  {t.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
