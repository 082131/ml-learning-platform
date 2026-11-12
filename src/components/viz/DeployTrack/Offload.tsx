import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyFixed } from '@/lib/inference/format';
import { CPU_GBPS, GPUS, MODELS, RESERVE_GIB, type OffloadResult, type OffloadState } from '@/lib/deploy/offload';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import a from '../AiTrack/AiTrack.module.css';

const GIB = 2 ** 30;

/** Where each layer lives, what fills the GPU, and how long one token's weight reads take on each side. */
export function OffloadView() {
  const { state: s, result: r } = useExperimentContext<OffloadState, OffloadResult>('OffloadView');
  const m = MODELS[s.model];
  const g = GPUS[s.gpu];
  const gpuMs = r.gpuReadGiB > 0 ? ((r.gpuReadGiB * GIB) / (g.gbps * 1e9)) * 1000 : 0;
  const cpuMs = ((r.cpuReadGiB * GIB) / (CPU_GBPS * 1e9)) * 1000;
  const total = gpuMs + cpuMs;
  const share = (v: number, of: number) => `${of > 0 ? Math.min(100, (v / of) * 100) : 0}%`;
  const rows: [string, string, number, number][] = [
    ['GPU memory', `${pyFixed(r.gpuUsedGiB, 2)} of ${g.gib} GiB`, r.gpuUsedGiB, g.gib],
    ['GPU reads', `${pyFixed(gpuMs, 1)} ms`, gpuMs, total],
    ['RAM reads', `${pyFixed(cpuMs, 1)} ms`, cpuMs, total],
  ];
  return (
    <VizFrame
      title="Layers on the GPU and time per token"
      badge={<Badge tone="simulated">Estimate</Badge>}
      caption={`${m.label} ${s.quant}: ${r.ngl} of ${m.layers} layers on the GPU (-ngl ${r.ngl}). Each token reads ${pyFixed(r.gpuReadGiB, 2)} GiB at ${g.gbps} GB/s and ${pyFixed(r.cpuReadGiB, 2)} GiB at ${CPU_GBPS} GB/s: ${pyFixed(total, 1)} ms, about ${pyFixed(r.tokensPerSecond, 1)} tokens/s. ${RESERVE_GIB} GiB of the GPU is kept for buffers.`}
      table={
        <VizTable
          caption="Memory and time per token"
          columns={['part', 'value']}
          rows={[
            ['layers on GPU', `${r.ngl} of ${m.layers}`],
            ['output layer on', r.outputOnGpu ? 'GPU' : 'CPU'],
            ...rows.map(([label, text]) => [label, text]),
          ]}
        />
      }
    >
      <ol className={a.tokens} aria-label="Layers" data-ngl={r.ngl} data-tps={pyFixed(r.tokensPerSecond, 1)}>
        {Array.from({ length: m.layers }, (_, i) => (
          <li key={i} className={a.token} data-start={i >= r.ngl ? '' : undefined} title={i < r.ngl ? 'GPU' : 'CPU'}>
            {i}
            <small>{i < r.ngl ? 'GPU' : 'CPU'}</small>
          </li>
        ))}
      </ol>
      <div className={a.bars} style={{ marginTop: 'var(--s-3)' }}>
        {rows.map(([label, text, v, of]) => (
          <div key={label} style={{ display: 'contents' }}>
            <span>{label}</span>
            <span className={a.track} aria-hidden="true">
              <span className={a.fill} style={{ width: share(v, of) }} />
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </VizFrame>
  );
}
