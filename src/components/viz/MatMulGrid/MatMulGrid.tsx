import { CELL_LIMITS, setCell, type MatMulResult, type MatMulState } from '@/lib/math/matmulExperiment';
import { describeEntry } from '@/lib/trace/matmul';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './MatMulGrid.module.css';

/**
 * A × B = C with editable A and B. Selecting an entry of C highlights the row of A and the column
 * of B it comes from and writes out its sum. Use inside an Experiment made with matmulExperiment.
 */
export function MatMulGrid() {
  const { state, result, update } = useExperimentContext<MatMulState, MatMulResult>('MatMulGrid');
  const { A, B, focus } = state;
  const [i, j] = focus;
  const entry = describeEntry(A, B, i, j);
  const cells = result.C.flatMap((row, r) => row.map((_, c) => [r, c] as const));

  return (
    <VizFrame
      title="A × B = C"
      table={
        <VizTable
          caption="Every entry of C and its sum"
          columns={['Entry', 'Sum', 'Value']}
          rows={cells.map(([r, c]) => [`C[${r}][${c}]`, describeEntry(A, B, r, c).numbers, result.C[r]![c]!])}
        />
      }
      caption="Edit any number in A or B. Select an entry of C to see the row and column it comes from."
    >
      <div className={s.equation}>
        <MatrixGrid
          name="A"
          values={A}
          limits={CELL_LIMITS}
          highlightRows={[i]}
          onChange={(r, c, v) => update((st) => setCell(st, 'A', r, c, v))}
        />
        <span className={s.op} aria-hidden="true">
          ×
        </span>
        <MatrixGrid
          name="B"
          values={B}
          limits={CELL_LIMITS}
          highlightCols={[j]}
          onChange={(r, c, v) => update((st) => setCell(st, 'B', r, c, v))}
        />
        <span className={s.op} aria-hidden="true">
          =
        </span>
        <MatrixGrid
          name="C"
          values={result.C}
          selected={focus}
          onSelect={(r, c) => update((st) => ({ ...st, focus: [r, c] }))}
          caption={`shape (${result.C.length}, ${result.C[0]!.length}) · select an entry`}
        />
      </div>
      <div className={s.sum} aria-live="polite" data-entry={`${i},${j}`}>
        <span className={s.lhs}>
          C[{i}][{j}] = row {i} of A · column {j} of B
        </span>
        <span>= {entry.symbolic}</span>
        <span>= {entry.numbers}</span>
        <span>= {entry.products}</span>
        <span className={s.total}>= {entry.sum}</span>
      </div>
    </VizFrame>
  );
}
