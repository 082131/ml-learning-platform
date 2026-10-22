import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import {
  BEST_DROPOUT,
  BEST_LOG_LR,
  DROPOUT_RANGE,
  LOG_LR_RANGE,
  valLoss,
  type Trial,
  type TuningResult,
  type TuningState,
} from '@/lib/practice/tuning';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Axes } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './SearchPlane.module.css';

const CELLS = 30;
const HEIGHT = 300;
const STRIP = 34;
const M = { top: 12, right: 16, bottom: 44, left: 52 };
const FALLBACK_WIDTH = 640;
/** Loss values span about 0.30 (best) to 0.86 (worst) on this function. */
const SHADE_RANGE: [number, number] = [0.3, 0.86];

const fmtTrial = (t: Trial) =>
  `lr 10^${t.logLr.toFixed(2)}, dropout ${t.dropout.toFixed(2)}: loss ${t.loss.toFixed(4)}`;

/**
 * The tuning lesson's search space: the known validation loss as shading (darker is lower), grid trials
 * as squares, random trials as circles, the best of each ringed, and below the plot every learning
 * rate each method tried. Use inside an Experiment made with tuningExperiment.
 */
export function SearchPlane() {
  const { state, result } = useExperimentContext<TuningState, TuningResult>('SearchPlane');
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const x = scaleLinear()
    .domain(LOG_LR_RANGE)
    .range([M.left, width - M.right]);
  const y = scaleLinear()
    .domain(DROPOUT_RANGE)
    .range([HEIGHT - M.bottom, M.top]);
  const shade = scaleLinear().domain(SHADE_RANGE).range([0.85, 0]).clamp(true);
  const cw = (x.range()[1]! - x.range()[0]!) / CELLS;
  const ch = (y.range()[0]! - y.range()[1]!) / CELLS;
  const cells = Array.from({ length: CELLS * CELLS }, (_, n) => {
    const i = n % CELLS;
    const j = Math.floor(n / CELLS);
    const lx = LOG_LR_RANGE[0] + ((i + 0.5) / CELLS) * (LOG_LR_RANGE[1] - LOG_LR_RANGE[0]);
    const dy = DROPOUT_RANGE[0] + ((j + 0.5) / CELLS) * (DROPOUT_RANGE[1] - DROPOUT_RANGE[0]);
    return { i, j, o: shade(valLoss(lx, dy)) };
  });
  const budget = state.k * state.k;
  const stripY = HEIGHT + 8;
  return (
    <VizFrame
      title="Search space: learning rate × dropout"
      caption={`Stronger shading means lower validation loss; the minimum is at lr 10^${BEST_LOG_LR}, dropout ${BEST_DROPOUT} (+). With ${budget} trials each, grid's best is ${fmtTrial(result.bestGrid)}; random's best is ${fmtTrial(result.bestRandom)}. The strips below count the distinct learning rates each method tried.`}
      table={
        <VizTable
          caption="Every trial"
          columns={['method', 'log10 lr', 'dropout', 'val loss']}
          rows={[
            ...result.grid.map((t) => ['grid', t.logLr.toFixed(2), t.dropout.toFixed(2), t.loss.toFixed(4)]),
            ...result.random.map((t) => [
              'random',
              t.logLr.toFixed(2),
              t.dropout.toFixed(2),
              t.loss.toFixed(4),
            ]),
          ]}
        />
      }
    >
      <div ref={ref} className={s.plot}>
        <svg
          width={width}
          height={stripY + 2 * STRIP}
          role="img"
          aria-label={`${budget} grid trials and ${budget} random trials over learning rate and dropout`}
        >
          <g className={svg.accent} style={{ stroke: 'none' }}>
            {cells.map((c) => (
              <rect
                key={`${c.i},${c.j}`}
                x={M.left + c.i * cw}
                y={M.top + (CELLS - 1 - c.j) * ch}
                width={cw + 0.5}
                height={ch + 0.5}
                fillOpacity={c.o}
              />
            ))}
          </g>
          <Axes x={x} y={y} xLabel="log10(learning rate)" yLabel="dropout" format={formatNumber} />
          <g className={svg.ink} strokeWidth={2}>
            <path
              d={`M${x(BEST_LOG_LR) - 7},${y(BEST_DROPOUT)}h14M${x(BEST_LOG_LR)},${y(BEST_DROPOUT) - 7}v14`}
            />
          </g>
          <Points trials={result.grid} bestOf={result.bestGrid} x={x} y={y} shape="square" />
          <Points trials={result.random} bestOf={result.bestRandom} x={x} y={y} shape="circle" />
          <Strip label="grid" trials={result.grid} x={x} y0={stripY} shape="square" />
          <Strip label="random" trials={result.random} x={x} y0={stripY + STRIP} shape="circle" />
        </svg>
      </div>
      <ul className={s.legend} aria-label="Legend">
        <li>■ grid trial</li>
        <li>● random trial</li>
        <li>◯ best of its method</li>
        <li>+ true minimum</li>
      </ul>
    </VizFrame>
  );
}

type Scale = (n: number) => number;

function Mark({
  cx,
  cy,
  shape,
  r = 4.5,
}: {
  cx: number;
  cy: number;
  shape: 'square' | 'circle';
  r?: number;
}) {
  return shape === 'square' ? (
    <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} />
  ) : (
    <circle cx={cx} cy={cy} r={r} />
  );
}

function Points(p: { trials: Trial[]; bestOf: Trial; x: Scale; y: Scale; shape: 'square' | 'circle' }) {
  return (
    <g className={svg.ink} data-trials={p.shape}>
      {p.trials.map((t, n) => (
        <g key={n} style={{ fill: 'var(--surface)' }} strokeWidth={1.5}>
          <Mark cx={p.x(t.logLr)} cy={p.y(t.dropout)} shape={p.shape} />
        </g>
      ))}
      <g style={{ fill: 'none' }} strokeWidth={2.5}>
        <Mark cx={p.x(p.bestOf.logLr)} cy={p.y(p.bestOf.dropout)} shape={p.shape} r={9} />
      </g>
    </g>
  );
}

function Strip(p: { label: string; trials: Trial[]; x: Scale; y0: number; shape: 'square' | 'circle' }) {
  const cy = p.y0 + STRIP / 2;
  const distinct = [...new Set(p.trials.map((t) => t.logLr))];
  return (
    <g data-strip={p.label}>
      <text className={svg.label} x={M.left - 6} y={cy} dy="0.32em" textAnchor="end">
        {p.label}
      </text>
      <line className={svg.grid} x1={M.left} x2={p.x(LOG_LR_RANGE[1])} y1={cy} y2={cy} />
      <g className={svg.ink} style={{ fill: 'var(--surface)' }} strokeWidth={1.5}>
        {distinct.map((v) => (
          <Mark key={v} cx={p.x(v)} cy={cy} shape={p.shape} r={3.5} />
        ))}
      </g>
      <text className={svg.tick} x={p.x(LOG_LR_RANGE[1])} y={cy - 9} textAnchor="end">
        {distinct.length} learning rates
      </text>
    </g>
  );
}
