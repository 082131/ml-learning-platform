import { useRef, type ReactNode } from 'react';
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { line, area } from 'd3-shape';
import { Axes, DEFAULT_MARGIN, Grid } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import s from './StatsTrack.module.css';

export type Scale = ScaleLinear<number, number>;
export type Pt = readonly [number, number];

const FALLBACK_WIDTH = 640;
const fmt = (n: number) => String(Number(n.toPrecision(4)));

interface PlotProps {
  label: string;
  xDomain: [number, number];
  yDomain: [number, number];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  format?: (n: number) => string;
  /** Draws the marks with the plot's scales. */
  children: (x: Scale, y: Scale) => ReactNode;
}

/** Shared axes for the track's charts: a responsive SVG with scales that the marks receive. */
export function Plot({ label, xDomain, yDomain, xLabel, yLabel, height = 220, format = fmt, children }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const m = DEFAULT_MARGIN;
  const x = scaleLinear().domain(xDomain).range([m.left, Math.max(m.left + 40, width - m.right)]);
  const y = scaleLinear().domain(yDomain).range([height - m.bottom, m.top]);
  return (
    <div ref={ref} className={s.plot}>
      <svg width={width} height={height} role="img" aria-label={label}>
        <Grid x={x} y={y} ticks={width < 420 ? 4 : 6} />
        <Axes x={x} y={y} xLabel={xLabel} yLabel={yLabel} ticks={width < 420 ? 4 : 6} format={format} />
        {children(x, y)}
      </svg>
    </div>
  );
}

/** A curve through the points. */
export function Curve({ x, y, pts, tone = 'accent', dashed }: { x: Scale; y: Scale; pts: readonly Pt[]; tone?: Tone; dashed?: boolean }) {
  const d = line<Pt>()
    .x((p) => x(p[0]))
    .y((p) => y(p[1]))(pts as Pt[]);
  return <path className={s.curve} data-tone={tone} data-dashed={dashed || undefined} d={d ?? ''} />;
}

/** The area between a curve and zero, for x in [from, to]. */
export function Shade({ x, y, pts, from, to, tone = 'accent' }: { x: Scale; y: Scale; pts: readonly Pt[]; from: number; to: number; tone?: Tone }) {
  const inside = pts.filter((p) => p[0] >= from && p[0] <= to);
  if (inside.length < 2) return null;
  const d = area<Pt>()
    .x((p) => x(p[0]))
    .y0(y(0))
    .y1((p) => y(p[1]))(inside as Pt[]);
  return <path className={s.shade} data-tone={tone} d={d ?? ''} />;
}

export type Tone = 'accent' | 'muted' | 'err' | 'ok' | 'warn';

/** A labelled vertical line at x = at. */
export function VLine({ x, y, at, label, tone = 'muted', anchor = 'middle' }: { x: Scale; y: Scale; at: number; label?: string; tone?: Tone; anchor?: 'start' | 'middle' | 'end' }) {
  const [top] = y.range().slice(-1) as [number];
  const [bottom] = y.range() as [number];
  return (
    <g className={s.vline} data-tone={tone}>
      <line x1={x(at)} x2={x(at)} y1={bottom} y2={top} />
      {label && (
        <text x={x(at)} y={top + 10} textAnchor={anchor} dx={anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0}>
          {label}
        </text>
      )}
    </g>
  );
}

/** Bars centred on whole numbers (or on bin midpoints when width is given). */
export function Bars({
  x,
  y,
  bars,
  width = 1,
  tone,
}: {
  x: Scale;
  y: Scale;
  bars: readonly { at: number; h: number; on?: boolean }[];
  width?: number;
  tone?: (on: boolean) => Tone;
}) {
  const w = Math.max(1, Math.abs(x(width) - x(0)) * 0.82);
  return (
    <g>
      {bars.map((b, i) => (
        <rect
          key={i}
          className={s.bar}
          data-tone={tone ? tone(!!b.on) : b.on ? 'accent' : 'muted'}
          data-on={b.on || undefined}
          x={x(b.at) - w / 2}
          width={w}
          y={y(b.h)}
          height={Math.max(0, y(0) - y(b.h))}
        />
      ))}
    </g>
  );
}

/** Evenly spaced points of f on [lo, hi]. */
export function sampleCurve(f: (x: number) => number, lo: number, hi: number, steps = 240): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const xv = lo + ((hi - lo) * i) / steps;
    return [xv, f(xv)] as const;
  });
}

/** A key that names each mark by its pattern as well as its colour. */
export function Legend({ items }: { items: { tone: Tone; label: string; kind?: 'line' | 'dashed' | 'box' | 'hatch' }[] }) {
  return (
    <ul className={s.legend} aria-label="Legend">
      {items.map((it) => (
        <li key={it.label}>
          <span className={s.swatch} data-tone={it.tone} data-kind={it.kind ?? 'box'} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
