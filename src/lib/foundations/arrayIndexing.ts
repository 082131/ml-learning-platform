import type { ExperimentDef, ReadoutItem } from '../types';
import { sliceIndices } from './slicing';

// NumPy indexing of a = np.arange(12).reshape(shape), reproduced for the shape explorer. Results,
// printed text and error messages are checked against real NumPy in arrayIndexing.test.ts.

export const SHAPES = ['12', '2,6', '3,4', '4,3', '6,2'] as const;
export type ShapeKey = (typeof SHAPES)[number];

export const KINDS = ['element', 'row', 'column', 'corner'] as const;
export type IndexKind = (typeof KINDS)[number];

export interface IndexState {
  shape: ShapeKey;
  kind: IndexKind;
  i: number;
  j: number;
}

export const shapeOf = (key: ShapeKey): number[] => key.split(',').map(Number);

/** A shape as Python prints a tuple: (12,), (3, 4), (). */
export const tupleText = (shape: readonly number[]) =>
  shape.length === 1 ? `(${shape[0]},)` : `(${shape.join(', ')})`;

/** The index expression as written in code, for example a[1, 2] or a[:, 2]. */
export function indexText(kind: IndexKind, i: number, j: number): string {
  if (kind === 'element') return `a[${i}, ${j}]`;
  if (kind === 'row') return `a[${i}]`;
  if (kind === 'column') return `a[:, ${j}]`;
  return `a[${i}:, ${j}:]`;
}

/** The reshape call as written in code: np.arange(12) or np.arange(12).reshape(3, 4). */
export const arrayText = (key: ShapeKey) =>
  key === '12' ? 'np.arange(12)' : `np.arange(12).reshape(${shapeOf(key).join(', ')})`;

/**
 * str() of a 1-D or 2-D integer array, as NumPy prints it: every number right-aligned to the widest
 * one. (Only small arrays occur here, so NumPy's line wrapping at 75 characters never applies.)
 */
export function arrayStr(values: number[] | number[][]): string {
  const flat = (values as (number | number[])[]).flat() as number[];
  if (flat.length === 0) return '[]';
  const w = Math.max(...flat.map((v) => String(v).length));
  const row = (r: number[]) => `[${r.map((v) => String(v).padStart(w)).join(' ')}]`;
  return Array.isArray(values[0])
    ? `[${(values as number[][]).map(row).join('\n ')}]`
    : row(values as number[]);
}

export type IndexResult =
  | {
      ok: true;
      shape: number[];
      /** The grid of a (one row for a 1-D array). */
      grid: number[][];
      /** Cells of the grid that the index picks, as [row, column]. */
      cells: [number, number][];
      /** The result's shape; [] for a single number. */
      outShape: number[];
      printed: string;
    }
  | { ok: false; shape: number[]; grid: number[][]; cells: []; error: string };

const outOfBounds = (index: number, axis: number, size: number) =>
  `IndexError: index ${index} is out of bounds for axis ${axis} with size ${size}`;

/** Python's index normalization for one axis: negative counts from the end; out of range is an error. */
function axisIndex(index: number, axis: number, size: number): number | string {
  if (index < -size || index >= size) return outOfBounds(index, axis, size);
  return index < 0 ? index + size : index;
}

export function computeIndex(s: IndexState): IndexResult {
  const shape = shapeOf(s.shape);
  const [rows, cols] = shape.length === 1 ? [1, shape[0]!] : [shape[0]!, shape[1]!];
  const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => r * cols + c));
  const fail = (error: string): IndexResult => ({ ok: false, shape, grid, cells: [], error });
  const wanted = s.kind === 'row' ? 1 : 2;
  if (wanted > shape.length)
    return fail(
      `IndexError: too many indices for array: array is ${shape.length}-dimensional, but ${wanted} were indexed`,
    );

  const done = (cells: [number, number][], outShape: number[], values: number[] | number[][] | number) => ({
    ok: true as const,
    shape,
    grid,
    cells,
    outShape,
    printed: typeof values === 'number' ? String(values) : arrayStr(values),
  });

  if (shape.length === 1) {
    const k = axisIndex(s.i, 0, cols);
    return typeof k === 'string' ? fail(k) : done([[0, k]], [], k);
  }

  const range = (n: number) => Array.from({ length: n }, (_, k) => k);
  if (s.kind === 'element') {
    const r = axisIndex(s.i, 0, rows);
    if (typeof r === 'string') return fail(r);
    const c = axisIndex(s.j, 1, cols);
    if (typeof c === 'string') return fail(c);
    return done([[r, c]], [], grid[r]![c]!);
  }
  if (s.kind === 'row') {
    const r = axisIndex(s.i, 0, rows);
    if (typeof r === 'string') return fail(r);
    return done(
      range(cols).map((c) => [r, c]),
      [cols],
      grid[r]!,
    );
  }
  if (s.kind === 'column') {
    const c = axisIndex(s.j, 1, cols);
    if (typeof c === 'string') return fail(c);
    return done(
      range(rows).map((r) => [r, c]),
      [rows],
      grid.map((row) => row[c]!),
    );
  }
  // a[i:, j:] : slices are clipped, never an error.
  const [r0] = sliceIndices(rows, s.i, null, null);
  const [c0] = sliceIndices(cols, s.j, null, null);
  const rs = range(rows).filter((r) => r >= r0);
  const cs = range(cols).filter((c) => c >= c0);
  const block = rs.map((r) => cs.map((c) => grid[r]![c]!));
  return done(
    rs.flatMap((r) => cs.map((c) => [r, c] as [number, number])),
    [rs.length, cs.length],
    block,
  );
}

export function indexReadout(s: IndexState, r: IndexResult): ReadoutItem[] {
  const expr = indexText(s.kind, s.i, s.j);
  const items: ReadoutItem[] = [{ label: 'print(a.shape)', value: tupleText(r.shape) }];
  if (!r.ok) return [...items, { label: `part = ${expr}`, value: r.error, status: 'error' }];
  return [
    ...items,
    { label: `print(${expr})`, value: r.printed },
    {
      label: 'print(part.shape)',
      value: `${tupleText(r.outShape)}${r.outShape.length === 0 ? ' (a single number)' : ''}`,
    },
  ];
}

const KIND_LABELS: Record<IndexKind, string> = {
  element: 'one element: a[i, j]',
  row: 'a row: a[i]',
  column: 'a column: a[:, j]',
  corner: 'a block: a[i:, j:]',
};

export function indexExperiment(id: string, initial: IndexState): ExperimentDef<IndexState, IndexResult> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'shape',
        label: 'Shape of a',
        options: SHAPES.map((k) => ({ value: k, label: tupleText(shapeOf(k)) })),
        get: (s) => s.shape,
        set: (s, v) => ({ ...s, shape: v as ShapeKey }),
      },
      {
        kind: 'select',
        id: 'kind',
        label: 'Index',
        options: KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] })),
        get: (s) => s.kind,
        set: (s, v) => ({ ...s, kind: v as IndexKind }),
      },
      {
        kind: 'slider',
        id: 'i',
        label: 'i',
        min: -12,
        max: 11,
        get: (s) => s.i,
        set: (s, v) => ({ ...s, i: v }),
      },
      {
        kind: 'slider',
        id: 'j',
        label: 'j',
        min: -12,
        max: 11,
        get: (s) => s.j,
        set: (s, v) => ({ ...s, j: v }),
      },
    ],
    compute: computeIndex,
    readout: indexReadout,
  };
}
