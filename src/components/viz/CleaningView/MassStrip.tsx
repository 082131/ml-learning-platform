import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import type { CleaningExperimentResult } from '@/lib/classical/cleaning';
import { pyRepr } from '@/lib/linalg/pyFormat';
import { formatNumber } from '@/lib/trace/values';
import { Marker } from '../ScatterPlot/ScatterPlot';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './CleaningView.module.css';

const HEIGHT = 170;
const M = { top: 28, right: 20, bottom: 40, left: 20 };
const LANE = 14;
const MIN_GAP = 10;

/** Greedy lanes so nearby dots stack instead of overlapping. */
function lanes(px: number[]): number[] {
  const last: number[] = [];
  return px.map((x) => {
    let lane = last.findIndex((l) => x - l >= MIN_GAP);
    if (lane === -1) lane = last.length;
    last[lane] = x;
    return lane;
  });
}

/** Body masses after cleaning on one axis, with the mean, the median and the 1.5·IQR fences. */
export function MassStrip({ result }: { result: CleaningExperimentResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const st = result.stats;
  const rows = result.kept.map((r) => r.row);
  const xs = result.masses;
  const all = [...xs, st.low, st.high];
  const x = scaleLinear()
    .domain([Math.min(...all), Math.max(...all)])
    .range([M.left, width - M.right])
    .nice();
  const order = xs.map((_, i) => i).sort((a, b) => xs[a]! - xs[b]!);
  const laneList = lanes(order.map((j) => x(xs[j]!)));
  const laneOf = new Map(order.map((i, k) => [i, laneList[k]!]));
  const base = HEIGHT - M.bottom - 12;
  const axisY = HEIGHT - M.bottom;
  const outliers = new Set(st.outliers);
  const caption = `${xs.length} body masses after cleaning. Mean ${pyRepr(st.mean)} g, median ${pyRepr(st.median)} g. Fences ${pyRepr(st.low)} to ${pyRepr(st.high)} g: ${
    st.outliers.length ? `row ${st.outliers.join(', ')} is outside` : 'no value is outside'
  }.`;
  return (
    <VizFrame
      title="Body mass after cleaning"
      caption={caption}
      table={
        <VizTable
          caption="Body mass statistics"
          columns={['statistic', 'value (g)']}
          rows={[
            ['mean', pyRepr(st.mean)],
            ['median', pyRepr(st.median)],
            ['Q1', pyRepr(st.q1)],
            ['Q3', pyRepr(st.q3)],
            ['IQR', pyRepr(st.iqr)],
            ['low fence', pyRepr(st.low)],
            ['high fence', pyRepr(st.high)],
            ['outlier rows', st.outliers.join(', ') || 'none'],
            ...xs.map((m, i) => [`row ${rows[i]}`, formatNumber(m)]),
          ]}
        />
      }
    >
      <div ref={ref} className={s.chart} data-mass-strip data-outliers={st.outliers.join(',')}>
        <svg width={width} height={HEIGHT} role="img" aria-label={caption}>
          <rect
            className={s.band}
            x={x(st.low)}
            width={Math.max(0, x(st.high) - x(st.low))}
            y={M.top}
            height={base - M.top + 8}
          />
          <line className={s.fence} x1={x(st.low)} x2={x(st.low)} y1={M.top} y2={base + 8} />
          <line className={s.fence} x1={x(st.high)} x2={x(st.high)} y1={M.top} y2={base + 8} />
          <line className={s.meanLine} x1={x(st.mean)} x2={x(st.mean)} y1={M.top - 14} y2={base + 8} />
          <line className={s.medianLine} x1={x(st.median)} x2={x(st.median)} y1={M.top} y2={base + 8} />
          <text className={svg.label} x={x(st.mean)} y={M.top - 18} textAnchor="middle">
            mean
          </text>
          <g aria-hidden="true">
            <line className={svg.axis} x1={M.left} x2={width - M.right} y1={axisY} y2={axisY} />
            {x.ticks(5).map((t) => (
              <g key={t} transform={`translate(${x(t)},${axisY})`}>
                <line className={svg.axis} y2={4} />
                <text className={svg.tick} y={16} textAnchor="middle">
                  {formatNumber(t)}
                </text>
              </g>
            ))}
            <text
              className={svg.axisLabel}
              x={(M.left + width - M.right) / 2}
              y={axisY + 34}
              textAnchor="middle"
            >
              body_mass_g
            </text>
          </g>
          {xs.map((m, i) => (
            <g key={rows[i]} className={outliers.has(rows[i]!) ? svg.err : svg.ink} data-point={rows[i]}>
              <Marker
                shape={outliers.has(rows[i]!) ? 'diamond' : 'circle'}
                cx={x(m)}
                cy={base - laneOf.get(i)! * LANE}
                r={outliers.has(rows[i]!) ? 6 : 4}
              />
            </g>
          ))}
        </svg>
      </div>
      <ul className={s.legend} aria-label="Legend">
        <li>solid line: mean</li>
        <li>dashed line: median</li>
        <li>dotted lines and shading: 1.5·IQR fences</li>
        <li>◆ outside the fences</li>
      </ul>
    </VizFrame>
  );
}
