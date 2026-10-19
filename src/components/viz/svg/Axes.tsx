import type { ScaleLinear } from 'd3-scale';
import s from './svg.module.css';

type Scale = ScaleLinear<number, number>;
export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export const DEFAULT_MARGIN: Margin = { top: 12, right: 16, bottom: 40, left: 52 };
const TICK = 4;

interface AxesProps {
  x: Scale;
  y: Scale;
  xLabel?: string;
  yLabel?: string;
  ticks?: number;
  format?: (n: number) => string;
  /** Draw the axes through 0 instead of along the bottom and left edges (for a coordinate plane). */
  centered?: boolean;
}

const fmt = (n: number) => String(Number(n.toPrecision(6)));

/** Tick-labeled x and y axes for the plot area spanned by the scales' ranges. */
export function Axes({ x, y, xLabel, yLabel, ticks = 5, format = fmt, centered }: AxesProps) {
  const [x0, x1] = x.range() as [number, number];
  const [y0, y1] = y.range() as [number, number]; // y0 is the bottom
  const ax = centered ? clampTo(y(0), y1, y0) : y0;
  const ay = centered ? clampTo(x(0), x0, x1) : x0;
  return (
    <g aria-hidden="true">
      <line className={s.axis} x1={x0} x2={x1} y1={ax} y2={ax} />
      <line className={s.axis} x1={ay} x2={ay} y1={y0} y2={y1} />
      {x.ticks(ticks).map((t) => (
        <g key={`x${t}`} transform={`translate(${x(t)},${ax})`}>
          <line className={s.axis} y2={TICK} />
          {!(centered && t === 0) && (
            <text className={s.tick} y={TICK + 12} textAnchor="middle">
              {format(t)}
            </text>
          )}
        </g>
      ))}
      {y.ticks(ticks).map((t) => (
        <g key={`y${t}`} transform={`translate(${ay},${y(t)})`}>
          <line className={s.axis} x2={-TICK} />
          {!(centered && t === 0) && (
            <text className={s.tick} x={-TICK - 3} dy="0.32em" textAnchor="end">
              {format(t)}
            </text>
          )}
        </g>
      ))}
      {xLabel && (
        <text className={s.axisLabel} x={(x0 + x1) / 2} y={y0 + 34} textAnchor="middle">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          className={s.axisLabel}
          transform={`translate(${x0 - 40},${(y0 + y1) / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          {yLabel}
        </text>
      )}
    </g>
  );
}

const clampTo = (v: number, a: number, b: number) => Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));

/** Faint grid lines at the tick positions. */
export function Grid({ x, y, ticks = 5 }: { x: Scale; y: Scale; ticks?: number }) {
  const [x0, x1] = x.range() as [number, number];
  const [y0, y1] = y.range() as [number, number];
  return (
    <g aria-hidden="true">
      {x.ticks(ticks).map((t) => (
        <line key={`x${t}`} className={s.grid} x1={x(t)} x2={x(t)} y1={y0} y2={y1} />
      ))}
      {y.ticks(ticks).map((t) => (
        <line key={`y${t}`} className={s.grid} x1={x0} x2={x1} y1={y(t)} y2={y(t)} />
      ))}
    </g>
  );
}
