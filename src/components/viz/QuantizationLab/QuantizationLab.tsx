import { useRef } from 'react';
import { scaleLinear } from 'd3-scale';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import type { QuantLabResult, QuantState } from '@/lib/inference/quantExperiment';
import { histogram } from '@/lib/inference/quantize';
import { Axes, DEFAULT_MARGIN } from '../svg/Axes';
import { LineChart } from '../LineChart/LineChart';
import { useElementWidth } from '../VizFrame/useElementWidth';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './QuantizationLab.module.css';

const BINS = 21;
const HEIGHT = 220;
const FALLBACK_WIDTH = 640;
const sig = (n: number) => String(Number(n.toPrecision(3)));

function ErrorHistogram({ r }: { r: QuantLabResult }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref, FALLBACK_WIDTH);
  const limit = r.stats.maxAbs || 1;
  const h = histogram(r.errors, limit, BINS);
  const m = DEFAULT_MARGIN;
  const x = scaleLinear()
    .domain([-limit, limit])
    .range([m.left, width - m.right]);
  const y = scaleLinear()
    .domain([0, Math.max(...h.counts)])
    .range([HEIGHT - m.bottom, m.top])
    .nice();
  const bins = h.counts.map((c, i) => ({ c, lo: h.edges[i]!, hi: h.edges[i + 1]! }));
  return (
    <VizFrame
      title="Quantization error per weight"
      caption={`${r.stats.count} weights (W1 and W2). Every error is within ±${sig(limit)}; most are much smaller.`}
      table={
        <VizTable
          caption="Error histogram"
          columns={['Error from', 'to', 'Weights']}
          rows={bins.map((b) => [sig(b.lo), sig(b.hi), b.c])}
        />
      }
    >
      <div ref={ref}>
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Histogram of dequantized minus original weight"
        >
          <Axes x={x} y={y} xLabel="dequantized − original" yLabel="weights" format={sig} />
          {bins.map((b, i) => (
            <rect
              key={i}
              className={svg.accent}
              x={x(b.lo) + 1}
              width={Math.max(0, x(b.hi) - x(b.lo) - 2)}
              y={y(b.c)}
              height={y(0) - y(b.c)}
            />
          ))}
        </svg>
      </div>
    </VizFrame>
  );
}

/** How many integer levels each output row of W1 spans (max q − min q + 1): per-tensor scales starve small rows. */
function LevelsPerRow({ r, st }: { r: QuantLabResult; st: QuantState }) {
  const levels = r.layers[0].q.map((row) => Math.max(...row) - Math.min(...row) + 1);
  const available = 2 ** st.bits - (st.scheme === 'symmetric' ? 1 : 0);
  return (
    <VizFrame
      title="Integer levels each row of W1 spans"
      caption={`Out of ${available} available. A row's weights land between its smallest and largest integer. With one scale per tensor, rows with small weights get only a few levels; with one scale per row, every row stretches over the whole range.`}
      table={
        <VizTable
          caption="Levels used per row"
          columns={['Row', 'Levels spanned', 'Scale']}
          rows={levels.map((l, i) => [
            i,
            l,
            sig((r.layers[0].params[st.granularity === 'tensor' ? 0 : i] ?? r.layers[0].params[0]!).scale),
          ])}
        />
      }
    >
      <ol className={s.levels}>
        {levels.map((l, i) => (
          <li key={i} data-row={i}>
            <span className={s.rowName}>row {i}</span>
            <span className={s.bar} style={{ width: `${(100 * l) / available}%` }} />
            <span className={s.count}>{l}</span>
          </li>
        ))}
      </ol>
    </VizFrame>
  );
}

/** Quantization of the digits model: error histogram, levels per row, and test accuracy by bit width. */
export function QuantizationLab() {
  const { state, result } = useExperimentContext<QuantState, QuantLabResult>('QuantizationLab');
  const label = { tensor: 'one scale per tensor', channel: 'one scale per row' } as const;
  return (
    <div className={s.layout} data-correct={result.correct}>
      <ErrorHistogram r={result} />
      <LevelsPerRow r={result} st={state} />
      <LineChart
        title={`Test images correct, ${state.scheme}`}
        xLabel="bits per weight"
        yLabel={`correct of ${result.testSize}`}
        yDomain={[0, result.testSize]}
        series={result.byBits.map((b) => ({
          id: b.granularity,
          label: label[b.granularity],
          points: b.points,
          dots: true,
          dashed: b.granularity === 'tensor',
          tone: b.granularity === 'tensor' ? 'muted' : 'accent',
        }))}
        caption={`Computed in your browser by running the quantized model on ${result.testSize} held-out digits. The float32 model gets ${result.floatCorrect} right. At ${state.bits} bits with ${label[state.granularity]}: ${result.correct}.`}
      />
    </div>
  );
}
