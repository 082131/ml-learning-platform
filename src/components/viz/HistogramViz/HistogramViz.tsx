import { useMemo, useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { UNITS, round2, type HistResult, type HistState } from '@/lib/foundations/histogram';
import { formatNumber } from '@/lib/trace/values';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Axes, DEFAULT_MARGIN, Grid } from '../svg/Axes';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './HistogramViz.module.css';

const HEIGHT = 280;

/**
 * The histogram ax.hist(values, bins=n) draws, from the same counts and edges as np.histogram.
 * Every bar's count and range is in the table view. Use inside an Experiment made with histExperiment.
 */
export function HistogramViz() {
  const { state, result } = useExperimentContext<HistState, HistResult>('HistogramViz');
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, 640);
  const m = DEFAULT_MARGIN;
  const { counts, edges } = result;
  const { x, y } = useMemo(
    () => ({
      x: scaleLinear()
        .domain([edges[0]!, edges.at(-1)!])
        .range([m.left, width - m.right]),
      y: scaleLinear()
        .domain([0, Math.max(...counts)])
        .range([HEIGHT - m.bottom, m.top])
        .nice(),
    }),
    [counts, edges, width, m],
  );
  const tallest = counts.indexOf(Math.max(...counts));
  const label = UNITS[state.column];

  return (
    <VizFrame
      title="Histogram"
      table={
        <VizTable
          caption={`np.histogram(values, bins=${state.bins})`}
          columns={['Bar', 'From', 'To', 'Penguins']}
          rows={counts.map((c, i) => [
            i,
            round2(edges[i]!),
            `${round2(edges[i + 1]!)}${i === counts.length - 1 ? ' (included)' : ''}`,
            c,
          ])}
        />
      }
      caption={`${result.values.length} penguins with a recorded ${state.column}, split into ${state.bins} equal-width bins of ${round2(edges[1]! - edges[0]!)} from ${round2(edges[0]!)} to ${round2(edges.at(-1)!)}. The tallest bar holds ${counts[tallest]} penguins, from ${round2(edges[tallest]!)} to ${round2(edges[tallest + 1]!)}.`}
    >
      <div ref={ref} className={s.chart}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Histogram of ${state.column} with ${state.bins} bins`}
          data-bins={counts.length}
        >
          <Grid x={x} y={y} />
          <g className={s.bars}>
            {counts.map((c, i) => (
              <rect
                key={i}
                data-count={c}
                x={x(edges[i]!)}
                width={Math.max(0, x(edges[i + 1]!) - x(edges[i]!))}
                y={y(c)}
                height={Math.max(0, y(0) - y(c))}
              />
            ))}
          </g>
          <Axes x={x} y={y} xLabel={label} yLabel="Penguins" format={formatNumber} />
          <text
            className={svg.label}
            x={x((edges[tallest]! + edges[tallest + 1]!) / 2)}
            y={y(counts[tallest]!) - 6}
            textAnchor="middle"
          >
            {counts[tallest]}
          </text>
        </svg>
      </div>
    </VizFrame>
  );
}
