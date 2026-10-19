import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './cx';
import s from './Popover.module.css';

interface PopoverProps {
  /** Content of the trigger button. */
  trigger: ReactNode;
  triggerClassName?: string;
  /** Accessible name of the popover panel. */
  label: string;
  children: ReactNode;
}

const VIEWPORT_MARGIN = 8;

/**
 * Click or Enter opens a small panel next to the trigger; Escape, a second click or a click outside closes it.
 * Renders only inline elements so it can sit inside a paragraph.
 */
export function Popover({ trigger, triggerClassName, label, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !panel.current) return;
    const rect = panel.current.getBoundingClientRect();
    const overflow = rect.right - (window.innerWidth - VIEWPORT_MARGIN);
    setShift(overflow > 0 ? -Math.min(overflow, rect.left - VIEWPORT_MARGIN) : 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  return (
    <span
      ref={root}
      className={s.root}
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
        className={cx(s.trigger, triggerClassName)}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <span
          ref={panel}
          id={id}
          role="dialog"
          aria-label={label}
          className={s.panel}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
        >
          {children}
        </span>
      )}
    </span>
  );
}
