import { useMemo, useRef, type ReactNode } from 'react';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import { isFiniteOrDiverged } from '@/lib/math/numeric';
import { formatNumber } from '@/lib/trace/values';
import { cx } from '@/components/ui';
import { Axes, DEFAULT_MARGIN, Grid } from '../svg/Axes';
import type { Tone } from '../svg/Arrow';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './LineChart.module.css';

export type XY = readonly [number, number];

export interface Series {
  id: string;
  label: string;
  points: readonly XY[];
  tone?: Tone;
  /** Dashed lines tell series apart without color. */
  dashed?: boolean;
  /** Draw a dot at every point (for a few discrete steps). */
  dots?: boolean;
  /** Leave a dense curve out of the table view. */
  inTable?: boolean;
}

export interface LineChartProps {
  title: string;
  series: Series[];
  xLabel: string;
  yLabel: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  caption?: ReactNode;
  badge?: ReactNode;
  height?: number;
  /** Extra SVG drawn over the plot with the same scales, for example a highlighted step. */
  overlay?: (x: (n: number) => number, y: (n: number) => number) => ReactNode;
}

const FALLBACK_WIDTH = 640;
const plottable = (p: XY) => isFiniteOrDiverged(p[0]) === 'finite' && isFiniteOrDiverged(p[1]) === 'finite';

/**
 * Lines on shared axes. Points that are NaN, infinite or diverged break the line instead of
 * stretching the axes; callers label divergence in their readout.
 */
export function LineChart({
  title,
  series,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  caption,
  badge,
  height = 260,
  overlay,
}: LineChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const m = DEFAULT_MARGIN;
  const { x, y } = useMemo(() => {
    const finite = series.flatMap((sr) => sr.points.filter(plottable));
    const xd = xDomain ?? (extent(finite, (p) => p[0]) as [number, number]);
    const yd = yDomain ?? (extent(finite, (p) => p[1]) as [number, number]);
    const safe = (d: [number, number] | [undefined, undefined]): [number, number] =>
      d[0] === undefined || d[1] === undefined ? [0, 1] : d[0] === d[1] ? [d[0] - 1, d[1] + 1] : [d[0], d[1]];
    return {
      x: scaleLinear()
        .domain(safe(xd))
        .range([m.left, width - m.right])
        .nice(),
      y: scaleLinear()
        .domain(safe(yd))
        .range([height - m.bottom, m.top])
        .nice(),
    };
  }, [series, xDomain, yDomain, width, height, m]);
  const path = line<XY>()
    .defined((p) => plottable(p) && within(y.domain(), p[1]))
    .x((p) => x(p[0]))
    .y((p) => y(p[1]));

  return (
    <VizFrame
      title={title}
      caption={caption}
      badge={badge}
      table={<SeriesTable title={title} series={series} xLabel={xLabel} />}
    >
      <div ref={ref} className={s.chart}>
        <svg width={width} height={height} role="img" aria-label={`${title}: ${yLabel} against ${xLabel}`}>
          <Grid x={x} y={y} />
          <Axes x={x} y={y} xLabel={xLabel} yLabel={yLabel} format={formatNumber} />
          {series.map((sr) => (
            <g key={sr.id} className={svg[sr.tone ?? 'accent']} data-series={sr.id}>
              <path className={cx(svg.line, sr.dashed && svg.dashed)} d={path(sr.points) ?? ''} />
              {sr.dots &&
                sr.points
                  .filter((p) => plottable(p) && within(y.domain(), p[1]))
                  .map((p, i) => <circle key={i} cx={x(p[0])} cy={y(p[1])} r={3.5} stroke="none" />)}
            </g>
          ))}
          {overlay?.(x, y)}
        </svg>
      </div>
      {series.length > 1 && (
        <ul className={s.legend} aria-label="Legend">
          {series.map((sr) => (
            <li key={sr.id}>
              <svg width="24" height="8" aria-hidden="true" className={svg[sr.tone ?? 'accent']}>
                <line className={cx(svg.line, sr.dashed && svg.dashed)} x1="0" x2="24" y1="4" y2="4" />
              </svg>
              {sr.label}
            </li>
          ))}
        </ul>
      )}
    </VizFrame>
  );
}

const within = ([a, b]: number[], v: number) => v >= Math.min(a!, b!) && v <= Math.max(a!, b!);

function SeriesTable({ title, series, xLabel }: { title: string; series: Series[]; xLabel: string }) {
  const shown = series.filter((sr) => sr.inTable !== false);
  const xs = [...new Set(shown.flatMap((sr) => sr.points.map((p) => p[0])))].sort((a, b) => a - b);
  const cell = (sr: Series, xv: number) => {
    const p = sr.points.find((q) => q[0] === xv);
    if (!p) return '';
    return isFiniteOrDiverged(p[1]) === 'finite' ? formatNumber(p[1]) : 'diverged';
  };
  return (
    <VizTable
      caption={title}
      columns={[xLabel, ...shown.map((sr) => sr.label)]}
      rows={xs.map((xv) => [formatNumber(xv), ...shown.map((sr) => cell(sr, xv))])}
    />
  );
}
