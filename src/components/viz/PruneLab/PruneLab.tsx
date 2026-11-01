import { useMemo } from 'react';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { Badge } from '@/components/ui';
import { pruneSweep, type PruneResult, type PruneState } from '@/lib/inference/prune';
import type { DigitsModel } from '@/lib/inference/digitsModel';
import { LineChart, type XY } from '../LineChart/LineChart';
import { VizFrame } from '../VizFrame/VizFrame';
import svg from '../svg/svg.module.css';
import s from './PruneLab.module.css';

const CELL = 8;

/** Accuracy against sparsity, and which of W1's 1,024 weights survive. Use with pruneExperiment. */
export function PruneLab({ model }: { model: DigitsModel }) {
  const { state, result: r } = useExperimentContext<PruneState, PruneResult>('PruneLab');
  const sweep = useMemo(() => pruneSweep(model, state.scope), [model, state.scope]);
  const mag: XY[] = sweep.map((p) => [p.sparsity, p.magnitude]);
  const rnd: XY[] = sweep.map((p) => [p.sparsity, p.random]);
  const rows = r.W1.length;
  const cols = r.W1[0]!.length;
  return (
    <div className={s.layout} data-prune-correct={r.correct} data-prune-kept={r.kept[0] + r.kept[1]}>
      <LineChart
        title="Test accuracy after pruning"
        xLabel="sparsity (%)"
        yLabel="correct of 360"
        badge={<Badge tone="neutral">Computed in your browser</Badge>}
        series={[
          { id: 'mag', label: `Smallest weights removed (${state.scope === 'layer' ? 'per layer' : 'global'})`, points: mag, dots: true },
          { id: 'rnd', label: 'Random weights removed (mean of 5 draws)', points: rnd, tone: 'muted', dashed: true },
        ]}
        xDomain={[0, 95]}
        yDomain={[0, 360]}
        overlay={(x, y) => (
          <circle className={svg.err} cx={x(state.sparsity)} cy={y(r.correct)} r={7} fill="none" strokeWidth={2} aria-hidden="true" />
        )}
        caption={`At ${state.sparsity}% sparsity the pruned model gets ${r.correct} of 360 test images right (${r.floatCorrect} before pruning). Removing random weights instead of the smallest ones loses accuracy far sooner.`}
      />
      <VizFrame
        title="Which weights of W1 survive"
        caption={`W1 has 16 rows (hidden units) × 64 columns (pixels). ${r.kept[0]} of 1,024 weights are left. Filled cells are kept, empty cells were set to zero. Columns for corner pixels, which are almost always blank, were near zero to begin with and go first.`}
      >
        <svg
          className={s.grid}
          viewBox={`0 0 ${cols * CELL} ${rows * CELL}`}
          role="img"
          aria-label={`Mask of W1: ${r.kept[0]} of ${rows * cols} weights kept`}
        >
          {r.W1.map((row, i) =>
            row.map((w, j) => (
              <rect
                key={`${i}-${j}`}
                x={j * CELL + 0.5}
                y={i * CELL + 0.5}
                width={CELL - 1}
                height={CELL - 1}
                className={w === 0 ? s.pruned : s.kept}
              />
            )),
          )}
        </svg>
      </VizFrame>
    </div>
  );
}
