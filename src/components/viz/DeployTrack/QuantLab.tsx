import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { OUTLIER_INDEX, type QuantResult, type QuantState } from '@/lib/deploy/blockQuant';
import { ScatterPlot, type ScatterPoint } from '../ScatterPlot/ScatterPlot';
import { VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';

const LIMIT = 0.06;
const f = (x: number, d = 4) => x.toFixed(d);

/** Original against dequantized weights, and the error of each, with the block boundary at 32. */
export function QuantLab() {
  const { state: s, result: r } = useExperimentContext<QuantState, QuantResult>('QuantLab');
  const shown = (i: number) => Math.abs(r.weights[i]!) <= LIMIT;
  const values: ScatterPoint[] = r.weights.flatMap((w, i) =>
    shown(i)
      ? [
          { x: i, y: w, group: 'original', id: `o${i}`, hollow: true },
          { x: i, y: r.deq[i]!, group: 'deq', id: `d${i}` },
        ]
      : [],
  );
  const errors: ScatterPoint[] = r.err.map((e, i) => ({ x: i, y: e, group: i < 32 ? 'b0' : 'b1', id: i }));
  const errTop = Math.max(0.004, ...r.err.map(Math.abs)) * 1.15;
  const boundary = s.format === 'INT4_TENSOR' ? null : 31.5;
  const line = (x: (n: number) => number, y: (n: number) => number, lo: number, hi: number) =>
    boundary === null ? null : (
      <line className={svg.muted} x1={x(boundary)} x2={x(boundary)} y1={y(lo)} y2={y(hi)} strokeDasharray="4 3" aria-hidden="true" />
    );
  const hidden = s.outlier === 'on';
  return (
    <div data-quant-rmse={f(r.rmse, 6)} data-quant-bpw={r.bpw} data-quant-d1={f(r.blocks.at(-1)!.d, 7)}>
      <ScatterPlot
        title="Original (hollow) and dequantized (filled) weights"
        badge={<Badge tone="simulated">Computed here</Badge>}
        xLabel="weight index"
        yLabel="value"
        xDomain={[0, 63]}
        yDomain={[-LIMIT, LIMIT]}
        groups={[
          { id: 'original', label: 'Original', tone: 'muted', shape: 'circle' },
          { id: 'deq', label: 'Dequantized', tone: 'accent', shape: 'circle' },
        ]}
        points={values}
        overlay={(x, y) => line(x, y, -LIMIT, LIMIT)}
        caption={`${s.format === 'INT4_TENSOR' ? 'One scale for all 64 weights' : 'Two blocks of 32, split at the dashed line'}. ${hidden ? `Weight ${OUTLIER_INDEX} (0.31) is above the chart; it is stored exactly.` : ''} RMSE ${f(r.rmse, 6)} at ${r.bpw} bits per weight.`}
        table={
          <VizTable
            caption="Scale and largest error per block"
            columns={['block', 'scale d (float16)', 'max |error|']}
            rows={r.blocks.map((b, i) => [i, f(b.d, 7), f(b.maxErr, 6)])}
          />
        }
      />
      <ScatterPlot
        title="Error of each weight (dequantized − original)"
        badge={<Badge tone="simulated">Computed here</Badge>}
        xLabel="weight index"
        yLabel="error"
        xDomain={[0, 63]}
        yDomain={[-errTop, errTop]}
        groups={[
          { id: 'b0', label: 'Block 0', tone: 'accent', shape: 'circle' },
          { id: 'b1', label: 'Block 1', tone: 'muted', shape: 'square' },
        ]}
        points={errors}
        overlay={(x, y) => line(x, y, -errTop, errTop)}
        caption={r.blocks
          .map((b, i) => `Block ${i}: scale ${f(b.d, 7)}, largest error ${f(b.maxErr, 6)} (half a step is ${f(Math.abs(b.d) / 2, 6)})`)
          .join('. ')}
      />
    </div>
  );
}
