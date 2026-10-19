import { CELL_LIMITS, newCell } from '../math/matmulExperiment';
import { addMatrices, formatShape, resize, transpose, withEntry } from '../math/matrix';
import { formatNumpyIntMatrix, pythonList } from '../math/numpyFormat';
import type { ExperimentDef } from '../types';
import { numpyVector } from './pyFormat';

/** Two same-shape matrices and a selected entry, shared by the matrices lesson's views. */
export interface MatrixOpsState {
  A: number[][];
  B: number[][];
  /** The selected entry [i, j] of A (shown at [j, i] in Aᵀ). */
  focus: [number, number];
}
export interface MatrixOpsResult {
  T: number[][];
  S: number[][];
}

export const MAX_SIZE = 4;
export { CELL_LIMITS };

/** Resizes A and B together (addition needs equal shapes) and keeps the selection inside them. */
export function resizeOps(s: MatrixOpsState, rows: number, cols: number): MatrixOpsState {
  return {
    A: resize(s.A, rows, cols, newCell),
    B: resize(s.B, rows, cols, (i, j) => newCell(j, i)),
    focus: [Math.min(s.focus[0], rows - 1), Math.min(s.focus[1], cols - 1)],
  };
}

export const setOpsCell = (
  s: MatrixOpsState,
  which: 'A' | 'B',
  i: number,
  j: number,
  v: number,
): MatrixOpsState => ({ ...s, [which]: withEntry(s[which], i, j, v) });

/** "S[0][2] = A[0][2] + B[0][2] = 3 + (-1) = 2" */
export function describeSumEntry(A: number[][], B: number[][], i: number, j: number) {
  const [a, b] = [A[i]![j]!, B[i]![j]!];
  const p = (x: number) => (x < 0 ? `(${x})` : String(x));
  return `A[${i}][${j}] + B[${i}][${j}] = ${p(a)} + ${p(b)} = ${a + b}`;
}

/** The lesson's experiment: sizes, editable A and B, A + B and Aᵀ. The readout is what the code prints. */
export function matrixOpsExperiment(id: string, A: number[][], B: number[][]): ExperimentDef<
  MatrixOpsState,
  MatrixOpsResult
> {
  return {
    id,
    initial: { A, B, focus: [0, 0] },
    controls: [
      {
        kind: 'slider',
        id: 'rows',
        label: 'Rows',
        min: 1,
        max: MAX_SIZE,
        get: (s) => s.A.length,
        set: (s, r) => resizeOps(s, r, s.A[0]!.length),
      },
      {
        kind: 'slider',
        id: 'cols',
        label: 'Columns',
        min: 1,
        max: MAX_SIZE,
        get: (s) => s.A[0]!.length,
        set: (s, c) => resizeOps(s, s.A.length, c),
      },
    ],
    compute: (s) => ({ T: transpose(s.A), S: addMatrices(s.A, s.B) }),
    readout: (s, r) => {
      const [i, j] = s.focus;
      return [
        { label: 'print(A.shape)', value: formatShape([s.A.length, s.A[0]!.length]) },
        { label: `print(A[${i}, ${j}])`, value: String(s.A[i]![j]!) },
        { label: `print(A[${i}])`, value: numpyVector(s.A[i]!, false) },
        { label: 'print(A + B)', value: formatNumpyIntMatrix(r.S) },
        { label: 'print(A.T)', value: formatNumpyIntMatrix(r.T) },
        { label: 'print(A.T.shape)', value: formatShape([r.T.length, r.T[0]!.length]) },
      ];
    },
  };
}

const st = (s: unknown) => s as MatrixOpsState;
export const matrixOpsSlots = {
  A: (s: unknown) => pythonList(st(s).A),
  B: (s: unknown) => pythonList(st(s).B),
  i: (s: unknown) => String(st(s).focus[0]),
  j: (s: unknown) => String(st(s).focus[1]),
};
