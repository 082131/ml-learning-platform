import { useId, useMemo, useRef, type ReactNode } from 'react';
import { extent } from 'd3-array';
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { formatNumber } from '@/lib/trace/values';
import { cx } from '@/components/ui';
import { Axes, DEFAULT_MARGIN, Grid } from '../svg/Axes';
import type { Tone } from '../svg/Arrow';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './ScatterPlot.module.css';

export type MarkerShape = 'circle' | 'square' | 'triangle' | 'diamond';

/** A class of points. Groups differ by shape as well as tone, so they never rely on color alone. */
export interface ScatterGroup {
  id: string;
  label: string;
  tone: Tone;
  shape: MarkerShape;
}

export interface ScatterPoint {
  x: number;
  y: number;
  group: string;
  /** Stable id, for selection and the table. */
  id?: string | number;
  /** Drawn as an outline only, for example held-out (test) points. */
  hollow?: boolean;
}

type Scale = ScaleLinear<number, number>;

export interface ScatterPlotProps {
  title: string;
  points: readonly ScatterPoint[];
  groups: readonly ScatterGroup[];
  xLabel: string;
  yLabel: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  caption?: ReactNode;
  badge?: ReactNode;
  height?: number;
  /** Ids of points to ring, for example the selected example. */
  selected?: readonly (string | number)[];
  /** SVG drawn under the points with the same scales (shaded regions). */
  underlay?: (x: Scale, y: Scale) => ReactNode;
  /** SVG drawn over the points with the same scales (lines, centroids, labels). */
  overlay?: (x: Scale, y: Scale) => ReactNode;
  /** Replaces the default table (one row per point). */
  table?: ReactNode;
  /** A click on a point (keyboard users select points with the experiment's controls). */
  onPointClick?: (point: ScatterPoint) => void;
}

const FALLBACK_WIDTH = 640;

/** The data range, widened when all values are equal so the scale stays usable. */
function domainOf(values: number[]): [number, number] {
  const [a, b] = extent(values);
  if (a === undefined || b === undefined) return [0, 1];
  return a === b ? [a - 1, b + 1] : [a, b];
}
const R = 4;

/** One marker centered on (cx, cy). */
export function Marker({
  shape,
  cx: px,
  cy: py,
  r = R,
  hollow,
}: {
  shape: MarkerShape;
  cx: number;
  cy: number;
  r?: number;
  hollow?: boolean;
}) {
  const style = hollow ? { fill: 'var(--surface)', strokeWidth: 1.5 } : { strokeWidth: 0 };
  switch (shape) {
    case 'circle':
      return <circle cx={px} cy={py} r={r} style={style} />;
    case 'square':
      return <rect x={px - r * 0.9} y={py - r * 0.9} width={r * 1.8} height={r * 1.8} style={style} />;
    case 'triangle': {
      const h = r * 1.15;
      return (
        <polygon
          points={`${px},${py - h} ${px + h},${py + h * 0.8} ${px - h},${py + h * 0.8}`}
          style={style}
        />
      );
    }
    case 'diamond':
      return (
        <polygon
          points={`${px},${py - r * 1.2} ${px + r * 1.2},${py} ${px},${py + r * 1.2} ${px - r * 1.2},${py}`}
          style={style}
        />
      );
  }
}

/** Points on shared axes, grouped by marker shape and tone, with optional overlays and a table view. */
export function ScatterPlot({
  title,
  points,
  groups,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  caption,
  badge,
  height = 300,
  selected = [],
  underlay,
  overlay,
  table,
  onPointClick,
}: ScatterPlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const m = DEFAULT_MARGIN;
  const { x, y } = useMemo(
    () => ({
      x: scaleLinear()
        .domain(xDomain ?? domainOf(points.map((p) => p.x)))
        .range([m.left, width - m.right])
        .nice(),
      y: scaleLinear()
        .domain(yDomain ?? domainOf(points.map((p) => p.y)))
        .range([height - m.bottom, m.top])
        .nice(),
    }),
    [points, xDomain, yDomain, width, height, m],
  );
  const clipId = `scatter-clip-${useId().replace(/:/g, '')}`;
  const byId = new Map(groups.map((g) => [g.id, g]));
  const ringed = new Set(selected);

  return (
    <VizFrame
      title={title}
      caption={caption}
      badge={badge}
      table={
        table ?? <PointTable title={title} points={points} groups={byId} xLabel={xLabel} yLabel={yLabel} />
      }
    >
      <div ref={ref} className={s.chart}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}: ${yLabel} against ${xLabel}, ${points.length} points`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={m.left}
                y={m.top}
                width={Math.max(0, width - m.left - m.right)}
                height={Math.max(0, height - m.top - m.bottom)}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>{underlay?.(x, y)}</g>
          <Grid x={x} y={y} />
          <Axes x={x} y={y} xLabel={xLabel} yLabel={yLabel} format={formatNumber} />
          <g clipPath={`url(#${clipId})`}>
            {groups.map((g) => (
              <g key={g.id} className={svg[g.tone]} data-group={g.id}>
                {points
                  .filter((p) => p.group === g.id)
                  .map((p, i) => (
                    <g
                      key={p.id ?? i}
                      className={cx(onPointClick && s.clickable)}
                      onClick={onPointClick ? () => onPointClick(p) : undefined}
                      data-point={p.id}
                    >
                      <Marker shape={g.shape} cx={x(p.x)} cy={y(p.y)} hollow={p.hollow} />
                    </g>
                  ))}
              </g>
            ))}
            {points
              .filter((p) => p.id !== undefined && ringed.has(p.id))
              .map((p) => (
                <circle key={`ring-${p.id}`} className={s.ring} cx={x(p.x)} cy={y(p.y)} r={R + 5} />
              ))}
            {overlay?.(x, y)}
          </g>
        </svg>
      </div>
      <ul className={s.legend} aria-label="Legend">
        {groups.map((g) => (
          <li key={g.id}>
            <svg width="14" height="14" aria-hidden="true" className={svg[g.tone]}>
              <Marker shape={g.shape} cx={7} cy={7} r={4.5} />
            </svg>
            {g.label}
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}

function PointTable({
  title,
  points,
  groups,
  xLabel,
  yLabel,
}: {
  title: string;
  points: readonly ScatterPoint[];
  groups: Map<string, ScatterGroup>;
  xLabel: string;
  yLabel: string;
}) {
  return (
    <VizTable
      caption={title}
      columns={['#', xLabel, yLabel, 'group']}
      rows={points.map((p, i) => [
        String(p.id ?? i),
        formatNumber(p.x),
        formatNumber(p.y),
        `${groups.get(p.group)?.label ?? p.group}${p.hollow ? ' (hollow)' : ''}`,
      ])}
    />
  );
}
