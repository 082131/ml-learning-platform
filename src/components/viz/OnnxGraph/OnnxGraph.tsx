import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pyThousands as n } from '@/lib/inference/format';
import { intermediateBytes, LEVELS, type OnnxResult, type OnnxState, type OptLevel } from '@/lib/inference/onnxGraph';
import { StackedBars } from '../StackedBars/StackedBars';
import { VizFrame } from '../VizFrame/VizFrame';
import s from './OnnxGraph.module.css';

const shape = (perRow: number, fixed: number) => (perRow ? `(batch, ${perRow})` : fixed === 1024 ? '(64, 16)' : '(16, 10)');

/** The graph ONNX Runtime runs at the chosen optimization level, and the traffic between its nodes. */
export function OnnxGraph() {
  const { state, result: r } = useExperimentContext<OnnxState, OnnxResult>('OnnxGraph');
  return (
    <div className={s.layout} data-onnx-kernels={r.kernels} data-onnx-bytes={r.intermediateBytes}>
      <VizFrame
        title={`The graph at level “${LEVELS[state.level].label}”`}
        badge={<Badge tone="neutral">Recorded from ONNX Runtime 1.29.0</Badge>}
        caption={`${r.kernels} nodes, so ${r.kernels} kernels per call. Marked nodes were created by an optimization. Every level produced the same outputs.`}
      >
        <ol className={s.chain} aria-label="Nodes in execution order">
          <li className={s.io}>input pixels (batch, 64)</li>
          {r.nodes.map((nd, i) => (
            <li key={i} className={s.node} data-changed={nd.changed ? 'true' : 'false'}>
              <span className={s.op}>
                {nd.op}
                {nd.changed && <span className={s.mark}> ★ optimized</span>}
              </span>
              <span className={s.does}>{nd.does}</span>
              {nd.changed && <span className={s.why}>{nd.changed}</span>}
              <span className={s.out}>
                → {nd.out.name} {shape(nd.out.perRow, nd.out.fixed)}
              </span>
            </li>
          ))}
        </ol>
      </VizFrame>
      <StackedBars
        title={`Bytes passed between nodes, batch ${state.batch}`}
        badge={<Badge tone="neutral">Computed from the shapes</Badge>}
        parts={[{ key: 'b', label: 'Intermediate tensors written and read (float32)', fill: 'accent' }]}
        rows={(Object.keys(LEVELS) as OptLevel[]).map((lv) => ({
          label: `${LEVELS[lv].label}${lv === state.level ? ' (selected)' : ''}`,
          values: { b: intermediateBytes(LEVELS[lv].nodes, state.batch) },
          note: `${LEVELS[lv].nodes.length} nodes`,
        }))}
        format={(b) => `${n(b)} B`}
        caption="Each tensor passed from one node to the next is written to memory and read back: 2 × 4 bytes per value. Constant folding removes the per-call transposes; fusion removes whole intermediate tensors."
      />
    </div>
  );
}
