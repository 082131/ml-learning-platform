import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { formatBytes, pyThousands as n } from '@/lib/inference/format';
import type { TrainInferResult, TrainInferState } from '@/lib/inference/trainVsInfer';
import { StackedBars } from '../StackedBars/StackedBars';

const gflops = (x: number) => `${(x / 1e9).toFixed(3)} GFLOP`;

/** Memory and arithmetic of one training step next to one inference call. Use with trainInferExperiment. */
export function TrainVsInfer() {
  const { state: s, result: r } = useExperimentContext<TrainInferState, TrainInferResult>('TrainVsInfer');
  const shape = r.widths.join(' → ');
  return (
    <div data-train-memory={r.trainMemory} data-infer-memory={r.inferMemory}>
      <StackedBars
        title="Memory for one batch"
        badge={<Badge tone="neutral">Computed from the shapes</Badge>}
        parts={[
          { key: 'weights', label: 'Weights', fill: 'accent' },
          { key: 'grads', label: 'Gradients', fill: 'stripe' },
          { key: 'opt', label: 'Optimizer state', fill: 'ink' },
          { key: 'act', label: 'Activations', fill: 'warn' },
        ]}
        rows={[
          {
            label: 'Training step',
            values: { weights: r.weights, grads: r.grads, opt: r.optState, act: r.trainAct },
            note: `weights + gradients + ${s.optimizer} state + every layer's activations`,
          },
          {
            label: 'Inference call',
            values: { weights: r.weights, act: r.inferAct },
            note: 'weights + one layer’s input and output',
          },
        ]}
        format={formatBytes}
        caption={`MLP ${shape}, ${n(r.params)} float32 parameters, batch ${s.batch}. Training needs ${(r.trainMemory / r.inferMemory).toFixed(1)}× the memory of inference.`}
      />
      <StackedBars
        title="Arithmetic for one batch"
        badge={<Badge tone="neutral">Computed from the shapes</Badge>}
        parts={[
          { key: 'fwd', label: 'Forward pass', fill: 'accent' },
          { key: 'bwd', label: 'Backward pass', fill: 'stripe' },
        ]}
        rows={[
          {
            label: 'Training step',
            values: { fwd: r.inferFlops, bwd: r.trainFlops - r.inferFlops },
            note: `6 × ${n(r.macs)} × ${s.batch}`,
          },
          { label: 'Inference call', values: { fwd: r.inferFlops }, note: `2 × ${n(r.macs)} × ${s.batch}` },
        ]}
        format={gflops}
        caption="One multiply-add counts as 2 FLOPs. The backward pass costs about twice the forward pass: one gradient for each layer's input and one for its weights."
      />
    </div>
  );
}
