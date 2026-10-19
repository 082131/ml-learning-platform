import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cx } from './cx';
import { useLatest } from './useLatest';
import s from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Bottom sheet on phones, left drawer for navigation, centered for dialogs such as search. */
  side?: 'bottom' | 'left' | 'center';
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Modal sheet: focus moves in and is trapped, Escape or the backdrop closes it, focus returns on close. */
export function Sheet({ open, onClose, title, side = 'bottom', children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useLatest(onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // A child marked data-autofocus (such as a search box) gets focus; otherwise the panel itself.
    (panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
      } else if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, close]);

  if (!open) return null;
  return createPortal(
    <div className={s.root}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(s.panel, s[side])}
      >
        <div className={s.header}>
          <h2 id={titleId} className={s.title}>
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
