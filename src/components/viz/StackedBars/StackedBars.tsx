import type { ReactNode } from 'react';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './StackedBars.module.css';

export type BarFill = 'accent' | 'stripe' | 'warn' | 'ink' | 'dots';

export interface BarPart {
  key: string;
  label: string;
  fill: BarFill;
}

export interface BarRow {
  label: string;
  /** Value per part key; missing keys count as 0. */
  values: Record<string, number>;
  /** A short note shown after the total, for example a formula. */
  note?: string;
}

export interface StackedBarsProps {
  title: string;
  parts: BarPart[];
  rows: BarRow[];
  format: (n: number) => string;
  /** A dashed limit line, for example the GPU's memory. */
  limit?: { value: number; label: string };
  caption?: ReactNode;
  badge?: ReactNode;
  tableCaption?: string;
}

const pct = (x: number, of: number) => `${of > 0 ? ((100 * x) / of).toFixed(3) : 0}%`;

/**
 * Horizontal stacked bars on one shared scale, with a legend and a table alternative. Parts are told
 * apart by fill pattern as well as color, so the chart does not rely on color alone.
 */
export function StackedBars({ title, parts, rows, format, limit, caption, badge, tableCaption }: StackedBarsProps) {
  const total = (r: BarRow) => parts.reduce((t, p) => t + (r.values[p.key] ?? 0), 0);
  const scale = Math.max(limit?.value ?? 0, ...rows.map(total));
  return (
    <VizFrame
      title={title}
      badge={badge}
      caption={caption}
      table={
        <VizTable
          caption={tableCaption ?? title}
          columns={['Row', ...parts.map((p) => p.label), 'Total']}
          rows={rows.map((r) => [r.label, ...parts.map((p) => format(r.values[p.key] ?? 0)), format(total(r))])}
        />
      }
    >
      <ul className={s.legend} aria-label="Legend">
        {parts.map((p) => (
          <li key={p.key}>
            <span className={s.swatch} data-fill={p.fill} aria-hidden="true" />
            {p.label}
          </li>
        ))}
      </ul>
      <div className={s.rows}>
        {rows.map((r) => (
          <div key={r.label} className={s.row} data-row={r.label}>
            <div className={s.head}>
              <span className={s.label}>{r.label}</span>
              <span className={s.total}>{format(total(r))}</span>
              {r.note && <span className={s.note}>{r.note}</span>}
            </div>
            <div className={s.track} aria-hidden="true">
              {parts.map((p) =>
                (r.values[p.key] ?? 0) > 0 ? (
                  <span key={p.key} data-fill={p.fill} style={{ width: pct(r.values[p.key]!, scale) }} />
                ) : null,
              )}
              {limit && <span className={s.limit} style={{ left: pct(limit.value, scale) }} />}
            </div>
          </div>
        ))}
      </div>
      {limit && (
        <p className={s.limitNote}>
          <span className={s.limitSwatch} aria-hidden="true" /> {limit.label}: {format(limit.value)}
        </p>
      )}
    </VizFrame>
  );
}
