import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { formatBytes, GIB, pyThousands as n } from '@/lib/inference/format';
import { estimateMemory, MAX_BATCH, type MemoryEstimate, type MemoryState } from '@/lib/inference/memory';
import { LineChart, type XY } from '../LineChart/LineChart';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './MemoryBreakdown.module.css';

const PARTS = [
  { key: 'weights', label: 'Weights', className: s.weights },
  { key: 'kvCache', label: 'KV cache', className: s.kv },
  { key: 'activations', label: 'Activations', className: s.act },
] as const;

const pct = (x: number, of: number) => `${((100 * x) / of).toFixed(3)}%`;

/** The formula of each term with this state's numbers, as shown under the bar. */
function formulas(st: MemoryState, e: MemoryEstimate): Record<(typeof PARTS)[number]['key'], string> {
  const c = e.config;
  return {
    weights: `${n(e.params)} parameters × ${e.bytes.weights} bytes`,
    kvCache: `2 × ${c.layers} layers × ${c.kvHeads} KV heads × ${e.headDim} × ${n(st.seqLen)} tokens × ${st.batch} × ${e.bytes.kv} bytes`,
    activations: `${st.batch} × ${n(st.seqLen)} tokens × ${n(e.actWidth)} values × ${e.bytes.act} bytes`,
  };
}

/**
 * Memory estimate as one stacked bar against the GPU's capacity, the formula behind each part, and
 * total memory against batch size. Use inside an Experiment made with memoryExperiment.
 */
export function MemoryBreakdown() {
  const { state, result: e } = useExperimentContext<MemoryState, MemoryEstimate>('MemoryBreakdown');
  const scale = Math.max(e.total, e.gpuBytes);
  const f = formulas(state, e);
  const byBatch: XY[] = Array.from({ length: MAX_BATCH }, (_, i) => [
    i + 1,
    estimateMemory({ ...state, batch: i + 1 }).total / GIB,
  ]);
  const gpuLine: XY[] = [
    [1, state.gpu],
    [MAX_BATCH, state.gpu],
  ];
  const verdict = e.fits
    ? `Fits: ${formatBytes(e.total)} of ${state.gpu} GiB`
    : `Does not fit: ${formatBytes(e.total)} needed, ${state.gpu} GiB available`;

  return (
    <div className={s.layout} data-memory-fits={e.fits}>
      <VizFrame
        title="Where the memory goes"
        badge={<Badge tone="warn">Estimate</Badge>}
        caption={`${e.config.label}, batch ${state.batch}, ${n(state.seqLen)} tokens. ${verdict}. Not included: the framework's own memory (CUDA context, allocator reserve), which you measure on your machine.`}
        table={
          <VizTable
            caption="Memory estimate by part"
            columns={['Part', 'Bytes', 'Size', 'Formula']}
            rows={[
              ...PARTS.map((p) => [p.label, n(e[p.key]), formatBytes(e[p.key]), f[p.key]]),
              ['Total', n(e.total), formatBytes(e.total), 'weights + KV cache + activations'],
              ['GPU', n(e.gpuBytes), `${state.gpu} GiB`, `${state.gpu} × 2³⁰`],
            ]}
          />
        }
      >
        <p className={s.verdict} data-fits={e.fits} role="status">
          <strong>{e.fits ? 'Fits' : 'Does not fit'}</strong> {formatBytes(e.total)} of {state.gpu} GiB
        </p>
        <div className={s.track} aria-hidden="true">
          {PARTS.map((p) => (
            <span key={p.key} className={p.className} style={{ width: pct(e[p.key], scale) }} />
          ))}
          <span className={s.gpu} style={{ left: pct(e.gpuBytes, scale) }}>
            <span className={s.gpuLabel} style={e.gpuBytes / scale < 0.5 ? { left: 4 } : { right: 4 }}>
              {state.gpu} GiB GPU
            </span>
          </span>
        </div>
        <dl className={s.parts}>
          {PARTS.map((p) => (
            <div key={p.key} className={s.part} data-part={p.key}>
              <dt>
                <span className={`${s.swatch} ${p.className}`} aria-hidden="true" />
                {p.label}
              </dt>
              <dd>
                <span className={s.size}>{formatBytes(e[p.key])}</span>
                <span className={s.formula}>{f[p.key]}</span>
              </dd>
            </div>
          ))}
        </dl>
      </VizFrame>
      <LineChart
        title="Total memory by batch size"
        xLabel="batch size"
        yLabel="GiB"
        badge={<Badge tone="warn">Estimate</Badge>}
        series={[
          { id: 'total', label: 'Estimated total (GiB)', points: byBatch },
          { id: 'gpu', label: `GPU memory (${state.gpu} GiB)`, points: gpuLine, tone: 'muted', dashed: true },
        ]}
        yDomain={[0, Math.max(state.gpu, byBatch.at(-1)![1]) * 1.05]}
        overlay={(x, y) => (
          <circle
            className={svg.err}
            cx={x(state.batch)}
            cy={y(e.total / GIB)}
            r={6}
            fill="none"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        caption={`Each extra sequence adds ${formatBytes((e.kvCache + e.activations) / state.batch)} at ${n(state.seqLen)} tokens. The circle is batch ${state.batch}. ${e.maxBatch === 0 ? 'The weights alone do not fit.' : `Up to batch ${n(e.maxBatch)} fits by this estimate.`}`}
      />
    </div>
  );
}
