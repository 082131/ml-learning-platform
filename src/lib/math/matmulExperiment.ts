import { buildMatMulTrace } from '../trace/matmul';
import type { ExperimentDef } from '../types';
import { matmul, resize, shapeOf, withEntry } from './matrix';
import { formatNumpyIntMatrix } from './numpyFormat';

/** State shared by the MatMulGrid visualization, the slotted code, the trace and the readout. */
export interface MatMulState {
  A: number[][];
  B: number[][];
  /** The output entry C[i][j] being explained. */
  focus: [number, number];
}

export interface MatMulResult {
  C: number[][];
}

export const MATMUL_MAX_SIZE = 4;
/** Matrix cells take whole numbers in this range, so NumPy's integer printing can be shown exactly. */
export const CELL_LIMITS = { min: -20, max: 20, integer: true } as const;

/** Values for cells added when a matrix grows: small, varied and easy to multiply by hand. */
export const newCell = (i: number, j: number) => ((i * 3 + j * 2) % 5) + 1;

type Dim = 'm' | 'n' | 'p';

/** Changes one dimension of A (m×n) or B (n×p), keeping typed values and the focus inside C. */
export function resizeMatMul(s: MatMulState, dim: Dim, size: number): MatMulState {
  const [m, n] = shapeOf(s.A);
  const p = s.B[0]!.length;
  const next = { m, n, p, [dim]: size };
  return {
    A: resize(s.A, next.m, next.n, newCell),
    B: resize(s.B, next.n, next.p, newCell),
    focus: [Math.min(s.focus[0], next.m - 1), Math.min(s.focus[1], next.p - 1)],
  };
}

export const setCell = (s: MatMulState, which: 'A' | 'B', i: number, j: number, v: number): MatMulState => ({
  ...s,
  [which]: withEntry(s[which], i, j, v),
});

/**
 * The matrix multiplication experiment: sliders for the three sizes, cells edited in MatMulGrid,
 * the product computed with lib/math, and the triple-loop trace for `traceExample`.
 */
export function matmulExperiment(
  id: string,
  A: number[][],
  B: number[][],
  traceExample?: string,
): ExperimentDef<MatMulState, MatMulResult> {
  const size = (dim: Dim, label: string, get: (s: MatMulState) => number) =>
    ({
      kind: 'slider',
      id: dim,
      label,
      min: 1,
      max: MATMUL_MAX_SIZE,
      get,
      set: (s: MatMulState, v: number) => resizeMatMul(s, dim, v),
    }) as const;
  return {
    id,
    initial: { A, B, focus: [0, 0] },
    controls: [
      size('m', 'Rows of A (m)', (s) => s.A.length),
      size('n', 'Columns of A = rows of B (n)', (s) => s.B.length),
      size('p', 'Columns of B (p)', (s) => s.B[0]!.length),
    ],
    compute: (s) => ({ C: matmul(s.A, s.B) }),
    trace: (s) => buildMatMulTrace(s.A, s.B),
    traceExample,
    readout: (s, r) => {
      const [m, n] = shapeOf(s.A);
      const p = s.B[0]!.length;
      return [
        { label: 'NumPy: print(C.shape)', value: `(${m}, ${p})` },
        { label: 'NumPy: print(C)', value: formatNumpyIntMatrix(r.C) },
        { label: 'Multiply-adds (m·n·p)', value: `${m}·${n}·${p} = ${m * n * p}` },
      ];
    },
  };
}
