import type { ExperimentDef, ReadoutItem } from '../types';
import { arrayStr } from './arrayIndexing';

// NumPy broadcasting of C = A + B, reproduced for the broadcasting visualizer. Result shapes, printed
// values and the error message are checked against real NumPy in broadcasting.test.ts.

/** Shapes offered, as comma-separated sizes; '' is a plain number (shape ()). */
export const A_SHAPES = ['3', '2,3', '3,2', '2,1', '1,3'] as const;
export const B_SHAPES = ['', '3', '2', '1,3', '2,1', '3,1', '2,3', '3,2'] as const;
export type ShapeKey = (typeof A_SHAPES)[number] | (typeof B_SHAPES)[number];

export interface BroadcastState {
  a: ShapeKey;
  b: ShapeKey;
}

export const shapeOf = (key: ShapeKey): number[] => (key === '' ? [] : key.split(',').map(Number));

/** A shape the way NumPy writes it in error messages: (2,3), (3,), (). */
export const compactShape = (shape: readonly number[]) =>
  shape.length === 1 ? `(${shape[0]},)` : `(${shape.join(',')})`;

/** A shape the way print(x.shape) shows it: (2, 3), (3,), (). */
export const tupleText = (shape: readonly number[]) =>
  shape.length === 1 ? `(${shape[0]},)` : `(${shape.join(', ')})`;

/** A as values 0, 1, 2, ...; B as values 10, 20, 30, ...; both filled row by row. */
export function valuesOf(shape: readonly number[], first: number, step: number): number[][] {
  const [rows, cols] = shape.length === 2 ? shape : [1, shape[0] ?? 1];
  return Array.from({ length: rows! }, (_, r) =>
    Array.from({ length: cols! }, (_, c) => first + step * (r * cols! + c)),
  );
}

const literal = (shape: readonly number[], v: number[][]) => {
  if (shape.length === 0) return String(v[0]![0]);
  const row = (r: number[]) => `[${r.join(', ')}]`;
  return shape.length === 1 ? `np.array(${row(v[0]!)})` : `np.array([${v.map(row).join(', ')}])`;
};

/** The Python that creates A or B, for example np.array([[0, 1, 2], [3, 4, 5]]) or 10. */
export const aText = (key: ShapeKey) => literal(shapeOf(key), valuesOf(shapeOf(key), 0, 1));
export const bText = (key: ShapeKey) => literal(shapeOf(key), valuesOf(shapeOf(key), 10, 10));

/** One axis of the alignment, counted from the right: sizes of A and B (1 when missing) and the rule used. */
export interface AxisRule {
  a: number | null;
  b: number | null;
  out: number | null;
  rule: 'equal' | 'stretch A' | 'stretch B' | 'mismatch';
}

export type BroadcastResult = {
  aShape: number[];
  bShape: number[];
  axes: AxisRule[];
} & (
  | {
      ok: true;
      shape: number[];
      /** A and B stretched to the result shape (as 2-D grids), and the sum. */
      aGrid: number[][];
      bGrid: number[][];
      cGrid: number[][];
      /** For each cell of the result, whether A's and B's value there is a copy rather than an original. */
      aCopy: boolean[][];
      bCopy: boolean[][];
      printed: string;
    }
  | { ok: false; error: string }
);

export function computeBroadcast(s: BroadcastState): BroadcastResult {
  const aShape = shapeOf(s.a);
  const bShape = shapeOf(s.b);
  const n = Math.max(aShape.length, bShape.length);
  const at = (shape: number[], k: number) => (k < n - shape.length ? null : shape[k - (n - shape.length)]!);
  const axes: AxisRule[] = Array.from({ length: n }, (_, k) => {
    const a = at(aShape, k);
    const b = at(bShape, k);
    const x = a ?? 1;
    const y = b ?? 1;
    if (x === y) return { a, b, out: x, rule: 'equal' as const };
    if (x === 1) return { a, b, out: y, rule: 'stretch A' as const };
    if (y === 1) return { a, b, out: x, rule: 'stretch B' as const };
    return { a, b, out: null, rule: 'mismatch' as const };
  });
  if (axes.some((r) => r.rule === 'mismatch'))
    return {
      ok: false,
      aShape,
      bShape,
      axes,
      error: `ValueError: operands could not be broadcast together with shapes ${compactShape(aShape)} ${compactShape(bShape)} `,
    };

  const shape = axes.map((r) => r.out!);
  const [rows, cols] = shape.length === 2 ? shape : [1, shape[0]!];
  const A = valuesOf(aShape, 0, 1);
  const B = valuesOf(bShape, 10, 10);
  // Position in a stretched grid: an axis of size 1 (or a missing one) always reads index 0.
  const pick = (shape: number[], grid: number[][], r: number, c: number) => {
    const sr = shape.length === 2 ? shape[0]! : 1;
    const sc = shape.length === 0 ? 1 : shape[shape.length - 1]!;
    const i = sr === 1 ? 0 : r;
    const j = sc === 1 ? 0 : c;
    return { value: grid[i]![j]!, copy: i !== r || j !== c };
  };
  const cells = (shape: number[], grid: number[][]) =>
    Array.from({ length: rows! }, (_, r) => Array.from({ length: cols! }, (_, c) => pick(shape, grid, r, c)));
  const a = cells(aShape, A);
  const b = cells(bShape, B);
  const cGrid = a.map((row, r) => row.map((x, c) => x.value + b[r]![c]!.value));
  return {
    ok: true,
    aShape,
    bShape,
    axes,
    shape,
    aGrid: a.map((row) => row.map((x) => x.value)),
    bGrid: b.map((row) => row.map((x) => x.value)),
    cGrid,
    aCopy: a.map((row) => row.map((x) => x.copy)),
    bCopy: b.map((row) => row.map((x) => x.copy)),
    printed: arrayStr(shape.length === 2 ? cGrid : cGrid[0]!),
  };
}

export function broadcastReadout(s: BroadcastState, r: BroadcastResult): ReadoutItem[] {
  const shapes: ReadoutItem[] = [
    { label: 'A.shape', value: tupleText(r.aShape) },
    { label: 'B.shape', value: s.b === '' ? '(a plain number, like shape ())' : tupleText(r.bShape) },
  ];
  if (!r.ok) return [...shapes, { label: 'C = A + B', value: r.error, status: 'error' }];
  return [
    ...shapes,
    { label: 'print(C.shape)', value: tupleText(r.shape) },
    { label: 'print(C)', value: r.printed },
  ];
}

const label = (key: ShapeKey) => (key === '' ? 'a number: 10' : tupleText(shapeOf(key)));

export function broadcastExperiment(
  id: string,
  initial: BroadcastState,
): ExperimentDef<BroadcastState, BroadcastResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'a',
        label: 'Shape of A',
        options: A_SHAPES.map((k) => ({ value: k, label: label(k) })),
        get: (s) => s.a,
        set: (s, v) => ({ ...s, a: v as ShapeKey }),
      },
      {
        kind: 'select',
        id: 'b',
        label: 'Shape of B',
        options: B_SHAPES.map((k) => ({ value: k, label: label(k) })),
        get: (s) => s.b,
        set: (s, v) => ({ ...s, b: v as ShapeKey }),
      },
    ],
    compute: computeBroadcast,
    readout: broadcastReadout,
  };
}
