import { useRef } from 'react';
import { scaleBand, scaleLinear } from 'd3-scale';
import {
  DISTRIBUTIONS,
  sampleSize,
  type SampleSummary,
  type SamplingState,
} from '@/lib/probability/sampling';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Axes, DEFAULT_MARGIN } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './SamplingHistogram.module.css';

const HEIGHT = 240;
const FALLBACK_WIDTH = 640;

/**
 * Observed frequencies of a seeded sample (bars) against the true probabilities (dashed marks). Use
 * inside an Experiment made with samplingExperiment.
 */
export function SamplingHistogram() {
  const { state, result } = useExperimentContext<SamplingState, SampleSummary>('SamplingHistogram');
  const d = DISTRIBUTIONS[state.dist] ?? DISTRIBUTIONS.die!;
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const m = DEFAULT_MARGIN;
  const n = sampleSize(state.logN);
  const top = Math.max(...result.freqs, ...d.probs) * 1.15;
  const x = scaleBand<number>()
    .domain(d.values)
    .range([m.left, width - m.right])
    .padding(0.2);
  const y = scaleLinear()
    .domain([0, top])
    .range([HEIGHT - m.bottom, m.top])
    .nice();
  // Axes expects linear scales; a linear x over the band range draws the baseline only.
  const xLine = scaleLinear()
    .domain([0, 1])
    .range([m.left, width - m.right]);

  return (
    <VizFrame
      title="Sample vs distribution"
      table={
        <VizTable
          caption="Counts, observed frequencies and true probabilities"
          columns={['Outcome', 'Count', 'Frequency', 'Probability']}
          rows={d.values.map((v, i) => [
            v,
            result.counts[i]!,
            formatNumber(result.freqs[i]!),
            formatNumber(d.probs[i]!),
          ])}
        />
      }
      caption={`${n.toLocaleString('en-US')} draws with seed ${state.seed}. Bars are observed frequencies; dashed marks are the true probabilities. Largest gap: ${formatNumber(result.maxGap)}.`}
    >
      <div ref={ref} className={s.chart}>
        <svg width={width} height={HEIGHT} role="img" aria-label={`Histogram of ${n} draws from: ${d.label}`}>
          <Axes x={xLine} y={y} ticks={0} yLabel="frequency" format={formatNumber} />
          {y.ticks(4).map((t) => (
            <g key={t} transform={`translate(${m.left},${y(t)})`} aria-hidden="true">
              <line className={s.gridLine} x2={width - m.left - m.right} />
              <text className={s.tick} x={-6} dy="0.32em" textAnchor="end">
                {formatNumber(t)}
              </text>
            </g>
          ))}
          {d.values.map((v, i) => {
            const bx = x(v)!;
            const bw = x.bandwidth();
            return (
              <g key={v} data-outcome={v}>
                <rect
                  className={s.bar}
                  x={bx}
                  width={bw}
                  y={y(result.freqs[i]!)}
                  height={y(0) - y(result.freqs[i]!)}
                />
                <line
                  className={s.truth}
                  x1={bx - 3}
                  x2={bx + bw + 3}
                  y1={y(d.probs[i]!)}
                  y2={y(d.probs[i]!)}
                />
                <text className={s.tick} x={bx + bw / 2} y={HEIGHT - m.bottom + 16} textAnchor="middle">
                  {v}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className={s.legend} aria-label="Legend">
        <li>
          <span className={s.swatchBar} aria-hidden="true" /> observed frequency
        </li>
        <li>
          <span className={s.swatchTruth} aria-hidden="true" /> true probability
        </li>
      </ul>
    </VizFrame>
  );
}
