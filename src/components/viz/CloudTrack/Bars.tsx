import s from './CloudTrack.module.css';

export interface BarItem {
  key: string;
  label: string;
  value: number;
  /** The text shown at the end of the bar, e.g. "$800". */
  text: string;
  formula?: string;
  tone?: 'ok' | 'err' | 'muted';
}

/** Labelled horizontal bars scaled to the largest value (or to `max`). Status is in the text, not only the color. */
export function Bars({ items, max, label }: { items: BarItem[]; max?: number; label: string }) {
  const top = Math.max(max ?? 0, ...items.map((i) => (Number.isFinite(i.value) ? i.value : 0)), 1e-9);
  return (
    <ul className={s.bars} aria-label={label}>
      {items.map((i) => (
        <li key={i.key} className={s.bar} data-key={i.key}>
          <span>{i.label}</span>
          <span className={s.barTrack} aria-hidden="true">
            <span className={s.barFill} data-tone={i.tone} style={{ width: `${Number.isFinite(i.value) ? Math.min(100, (i.value / top) * 100) : 100}%` }} />
          </span>
          <span className={s.mono}>{i.text}</span>
          {i.formula && <span className={s.formula}>{i.formula}</span>}
        </li>
      ))}
    </ul>
  );
}
