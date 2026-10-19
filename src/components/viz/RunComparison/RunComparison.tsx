import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { describeSummary, type TrackingResult, type TrackingState } from '@/lib/practice/trackingExperiment';
import type { RunResult } from '@/lib/practice/sgdRun';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { LineChart } from '../LineChart/LineChart';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './RunComparison.module.css';

const ROW_H = 44;
const PAD = { left: 28, right: 20, top: 8, bottom: 36 };
const FALLBACK_WIDTH = 640;

const valOf = (r: RunResult) => (r.metrics.status === 'ok' ? r.metrics.valMse : undefined);
const show = (r: RunResult) =>
  r.metrics.status === 'ok' ? formatNumber(r.metrics.valMse) : `diverged in epoch ${r.metrics.epoch}`;

/**
 * The experiment-tracking lesson's visual (inside an Experiment made with trackingExperiment):
 * validation curves of the printed run for A and B, and every seed's final validation MSE.
 */
export function RunComparison() {
  const { state, result } = useExperimentContext<TrackingState, TrackingResult>('RunComparison');
  const pair = result.pairs.find((p) => p.seed === state.seed);
  const curve = (r: RunResult) => r.valCurve.map((v, i) => [i + 1, v] as const);
  return (
    <div className={s.layout}>
      <LineChart
        title={`Validation MSE per epoch, seed ${state.seed}`}
        xLabel="epoch"
        yLabel="val MSE"
        series={[
          { id: 'a', label: `A (lr ${state.lr})`, points: curve(result.run), dots: state.epochs <= 10 },
          ...(pair
            ? [
                {
                  id: 'b',
                  label: `B (lr ${state.lrB})`,
                  points: curve(pair.b),
                  tone: 'ink',
                  dashed: true,
                } as const,
              ]
            : []),
        ]}
        caption={`Final: A ${show(result.run)}${pair ? `, B ${show(pair.b)}` : ''}. A run stops when |w| passes 10⁶.`}
      />
      <SeedStrip state={state} result={result} />
    </div>
  );
}

function SeedStrip({ state, result }: { state: TrackingState; result: TrackingResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const rows = [
    { id: 'A', label: `A (lr ${state.lr})`, runs: result.pairs.map((p) => p.a), sum: result.summaryA },
    { id: 'B', label: `B (lr ${state.lrB})`, runs: result.pairs.map((p) => p.b), sum: result.summaryB },
  ];
  const all = [...result.summaryA.values, ...result.summaryB.values];
  const x = scaleLinear()
    .domain(all.length ? [Math.min(0, ...all), Math.max(...all)] : [0, 1])
    .range([PAD.left, width - PAD.right])
    .nice();
  const height = PAD.top + rows.length * ROW_H + PAD.bottom;
  const bottom = height - PAD.bottom;
  return (
    <VizFrame
      title="Final validation MSE by seed"
      caption={`Each dot is one run; the ringed dot is seed ${state.seed}, the bar is the mean. B beats A on ${result.bWins} of ${state.seeds} seeds. A: ${describeSummary(result.summaryA)}. B: ${describeSummary(result.summaryB)}.`}
      table={
        <VizTable
          caption="Final validation MSE by seed"
          columns={['seed', rows[0]!.label, rows[1]!.label, 'lower']}
          rows={result.pairs.map((p) => {
            const a = valOf(p.a);
            const b = valOf(p.b);
            const lower = b !== undefined && (a === undefined || b < a) ? 'B' : a !== undefined ? 'A' : '—';
            return [p.seed, show(p.a), show(p.b), lower];
          })}
        />
      }
    >
      <div ref={ref} className={s.strip}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Final validation MSE of every seed, for A and B"
        >
          <line className={svg.axis} x1={PAD.left} x2={width - PAD.right} y1={bottom} y2={bottom} />
          {x.ticks(5).map((t) => (
            <text key={t} className={svg.tick} x={x(t)} y={bottom + 16} textAnchor="middle">
              {formatNumber(t)}
            </text>
          ))}
          <text
            className={svg.axisLabel}
            x={(PAD.left + width - PAD.right) / 2}
            y={bottom + 32}
            textAnchor="middle"
          >
            final validation MSE (lower is better)
          </text>
          {rows.map((row, i) => {
            const cy = PAD.top + i * ROW_H + ROW_H / 2;
            return (
              <g key={row.id} className={i === 0 ? svg.accent : svg.ink} data-row={row.id}>
                <text className={svg.label} x={4} y={cy} dy="0.32em" stroke="none">
                  {row.id}
                </text>
                <line className={svg.grid} x1={PAD.left} x2={width - PAD.right} y1={cy} y2={cy} />
                {row.runs.map((r, seed) => {
                  const v = valOf(r);
                  if (v === undefined) return null;
                  return (
                    <circle
                      key={seed}
                      cx={x(v)}
                      cy={cy}
                      r={seed === state.seed ? 7 : 4}
                      fillOpacity={seed === state.seed ? 0 : 0.7}
                      strokeWidth={2}
                    />
                  );
                })}
                {row.sum.mean !== undefined && (
                  <line x1={x(row.sum.mean)} x2={x(row.sum.mean)} y1={cy - 14} y2={cy + 14} strokeWidth={3} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </VizFrame>
  );
}
