import { useId, useRef, useState, type ReactNode } from 'react';
import { Button, useOverflowFocus } from '@/components/ui';
import { useReducedMotion } from './useReducedMotion';
import s from './VizFrame.module.css';

interface VizFrameProps {
  title: string;
  /** One or two sentences that state what the visual shows, with its key values. Shown under it. */
  caption?: ReactNode;
  /** The same key values as a table (constitution VIII). Adds a "Table" toggle. */
  table?: ReactNode;
  /** For example a "Simulated" or "Estimate" badge. */
  badge?: ReactNode;
  children: ReactNode;
}

/** The frame every visualization sits in: title, dotted canvas, caption and a table alternative. */
export function VizFrame({ title, caption, table, badge, children }: VizFrameProps) {
  const [showTable, setShowTable] = useState(false);
  const reduced = useReducedMotion();
  const titleId = useId();
  const body = useRef<HTMLDivElement>(null);
  useOverflowFocus(body);
  return (
    <figure
      className={s.frame}
      data-wide
      data-viz={title}
      data-reduced-motion={reduced || undefined}
      aria-labelledby={titleId}
    >
      <div className={s.header}>
        <span id={titleId}>{title}</span>
        <span className={s.tools}>
          {badge}
          {table && (
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={showTable}
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? 'Show visual' : 'Show table'}
            </Button>
          )}
        </span>
      </div>
      <div ref={body} className={showTable ? s.tableWrap : s.canvas}>
        {showTable ? table : children}
      </div>
      {caption && <figcaption className={s.caption}>{caption}</figcaption>}
    </figure>
  );
}

/** A plain data table for VizFrame's table view. */
export function VizTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className={s.table}>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((v, j) =>
              j === 0 ? (
                <th key={j} scope="row">
                  {v}
                </th>
              ) : (
                <td key={j}>{v}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
