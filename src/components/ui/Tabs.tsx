import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import s from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  label: string;
  initial?: string;
  onChange?: (id: string) => void;
}

/** WAI-ARIA tabs: arrow keys move between tabs, Home and End jump to the ends. */
export function Tabs({ tabs, label, initial, onChange }: TabsProps) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();

  const select = (i: number) => {
    const tab = tabs[i];
    if (!tab) return;
    setActive(tab.id);
    onChange?.(tab.id);
    refs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const target = {
      ArrowRight: i === last ? 0 : i + 1,
      ArrowLeft: i === 0 ? last : i - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    select(target);
  };

  return (
    <div className={s.tabs}>
      <div role="tablist" aria-label={label} className={s.list}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            className={s.tab}
            onClick={() => select(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== active}
          tabIndex={0}
          className={s.panel}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
