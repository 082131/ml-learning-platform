import {
  CELL_LIMITS,
  describeSumEntry,
  setOpsCell,
  type MatrixOpsResult,
  type MatrixOpsState,
} from '@/lib/linalg/matrixOps';
import { useExperimentContext } from '@/components/experiment/ExperimentContext';
import { MatrixGrid } from '../MatrixGrid/MatrixGrid';
import { VizFrame, VizTable } from '../VizFrame/VizFrame';
import s from './MatrixOps.module.css';

interface MatrixOpsProps {
  /** Which operation to show: A → Aᵀ, or A + B. */
  op: 'transpose' | 'add';
}

/**
 * Editable matrices with transpose or element-wise addition (use inside an Experiment made with
 * matrixOpsExperiment). Selecting a result entry highlights where it comes from.
 */
export function MatrixOps({ op }: MatrixOpsProps) {
  const { state, result, update } = useExperimentContext<MatrixOpsState, MatrixOpsResult>('MatrixOps');
  const { A, B, focus } = state;
  const [i, j] = focus;
  const editA = (r: number, c: number, v: number) => update((st) => setOpsCell(st, 'A', r, c, v));
  const select = (r: number, c: number) => update((st) => ({ ...st, focus: [r, c] }));

  if (op === 'transpose')
    return (
      <VizFrame
        title="A and its transpose"
        table={
          <VizTable
            caption="Where each entry of A goes in A transposed"
            columns={['Entry of A', 'Value', 'Position in Aᵀ']}
            rows={A.flatMap((row, r) => row.map((x, c) => [`A[${r}][${c}]`, x, `Aᵀ[${c}][${r}]`]))}
          />
        }
        caption={`A has shape (${A.length}, ${A[0]!.length}), so Aᵀ has shape (${A[0]!.length}, ${A.length}). Row ${i} of A is column ${i} of Aᵀ.`}
      >
        <div className={s.equation}>
          <MatrixGrid
            name="A"
            values={A}
            limits={CELL_LIMITS}
            highlightRows={[i]}
            highlightCells={[[i, j]]}
            onChange={editA}
          />
          <span className={s.op} aria-hidden="true">
            →
          </span>
          <MatrixGrid
            name="Aᵀ"
            values={result.T}
            highlightCols={[i]}
            selected={[j, i]}
            onSelect={(r, c) => select(c, r)}
            caption={`shape (${result.T.length}, ${result.T[0]!.length}) · select an entry`}
          />
        </div>
        <p className={s.note} aria-live="polite" data-transpose-entry={`${i},${j}`}>
          A[{i}][{j}] = {A[i]![j]} sits at Aᵀ[{j}][{i}]: row and column swap places.
        </p>
      </VizFrame>
    );

  return (
    <VizFrame
      title="A + B"
      table={
        <VizTable
          caption="Every entry of A + B"
          columns={['Entry', 'Sum', 'Value']}
          rows={result.S.flatMap((row, r) =>
            row.map((x, c) => [`S[${r}][${c}]`, describeSumEntry(A, B, r, c).split(' = ')[1]!, x]),
          )}
        />
      }
      caption="Edit any number in A or B. Select an entry of the sum to see which entries are added."
    >
      <div className={s.equation}>
        <MatrixGrid name="A" values={A} limits={CELL_LIMITS} highlightCells={[[i, j]]} onChange={editA} />
        <span className={s.op} aria-hidden="true">
          +
        </span>
        <MatrixGrid
          name="B"
          values={B}
          limits={CELL_LIMITS}
          highlightCells={[[i, j]]}
          onChange={(r, c, v) => update((st) => setOpsCell(st, 'B', r, c, v))}
        />
        <span className={s.op} aria-hidden="true">
          =
        </span>
        <MatrixGrid
          name="S"
          values={result.S}
          selected={focus}
          onSelect={select}
          caption={`shape (${result.S.length}, ${result.S[0]!.length}) · select an entry`}
        />
      </div>
      <p className={s.note} aria-live="polite" data-sum-entry={`${i},${j}`}>
        S[{i}][{j}] = {describeSumEntry(A, B, i, j)}
      </p>
    </VizFrame>
  );
}
