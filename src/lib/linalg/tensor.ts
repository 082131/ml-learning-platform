import { formatNumpyIntMatrix } from '../math/numpyFormat';
import type { ExperimentDef } from '../types';

export type Shape3 = [number, number, number];
export type TensorOp = 'flatten' | 'merge' | 'transpose';
export type Index = number[];

/** What each operation is in NumPy, for x of shape (b, r, c). */
export const OPS: Record<TensorOp, { label: string; code: (s: Shape3) => string }> = {
  flatten: { label: 'Flatten each item: reshape(b, r·c)', code: ([b, r, c]) => `x.reshape(${b}, ${r * c})` },
  merge: { label: 'Merge batch and rows: reshape(b·r, c)', code: ([b, r, c]) => `x.reshape(${b * r}, ${c})` },
  transpose: { label: 'Swap the last two axes: transpose(0, 2, 1)', code: () => 'x.transpose(0, 2, 1)' },
};

export const size = (shape: readonly number[]) => shape.reduce((a, b) => a * b, 1);

/** Row-major (C order) flat position of an index: the order np.arange fills and reshape reads. */
export function ravel(index: Index, shape: readonly number[]): number {
  return index.reduce((flat, i, axis) => flat * shape[axis]! + i, 0);
}

export function unravel(flat: number, shape: readonly number[]): Index {
  const out: number[] = [];
  for (let axis = shape.length - 1; axis >= 0; axis--) {
    out.unshift(flat % shape[axis]!);
    flat = Math.floor(flat / shape[axis]!);
  }
  return out;
}

export function outputShape(op: TensorOp, [b, r, c]: Shape3): number[] {
  if (op === 'flatten') return [b, r * c];
  if (op === 'merge') return [b * r, c];
  return [b, c, r];
}

/** Where x[i, j, k] lands in y. Reshapes keep the flat order; transpose swaps the last two indices. */
export function destination(op: TensorOp, shape: Shape3, [i, j, k]: Index): Index {
  if (op === 'transpose') return [i!, k!, j!];
  return unravel(ravel([i!, j!, k!], shape), outputShape(op, shape));
}

/** Nested arrays for a shape, with each entry computed from its index. */
export function build(shape: readonly number[], at: (index: Index) => number, prefix: Index = []): unknown {
  if (prefix.length === shape.length) return at(prefix);
  return Array.from({ length: shape[prefix.length]! }, (_, i) => build(shape, at, [...prefix, i]));
}

/** x = np.arange(b·r·c).reshape(b, r, c): every entry equals its flat position. */
export const arange3 = (shape: Shape3) => build(shape, (idx) => ravel(idx, shape)) as number[][][];

/** y for each op, built from where every input entry goes. */
export function applyOp(op: TensorOp, shape: Shape3): number[][] | number[][][] {
  const out = outputShape(op, shape);
  if (op === 'transpose') return build(out, ([i, k, j]) => ravel([i!, j!, k!], shape)) as number[][][];
  return build(out, (idx) => ravel(idx, out)) as number[][];
}

/**
 * print() of a 3-D int array: 2-D blocks separated by a blank line, rows indented to their depth.
 * Checked against NumPy 2.5.3 for every shape up to (4, 4, 4) in tensor.test.ts.
 */
export function formatNumpyInt3(t: number[][][]): string {
  const width = Math.max(...t.flat(2).map((x) => String(x).length));
  const block = (m: number[][]) =>
    `[${m.map((row) => `[${row.map((x) => String(x).padStart(width)).join(' ')}]`).join('\n  ')}]`;
  return `[${t.map(block).join('\n\n ')}]`;
}

export function formatNumpyInt(t: number[][] | number[][][]): string {
  return Array.isArray(t[0]?.[0]) ? formatNumpyInt3(t as number[][][]) : formatNumpyIntMatrix(t as number[][]);
}

const tuple = (s: readonly number[]) => `(${s.join(', ')}${s.length === 1 ? ',' : ''})`;

export interface TensorState {
  shape: Shape3;
  op: TensorOp;
  /** The selected input entry [i, j, k] of x. */
  focus: Index;
}
export interface TensorResult {
  x: number[][][];
  y: number[][] | number[][][];
  outShape: number[];
  dest: Index;
  /** Where any x[i, j, k] lands in y (for the table view). */
  destOf: (i: number, j: number, k: number) => Index;
}

export const MAX_DIM = 4;

const resized = (s: TensorState, axis: number, n: number): TensorState => {
  const shape = s.shape.map((d, a) => (a === axis ? n : d)) as Shape3;
  return { ...s, shape, focus: s.focus.map((i, a) => Math.min(i, shape[a]! - 1)) };
};

/** The shape builder: batch, rows and columns, an operation, and a selected entry to follow. */
export function tensorExperiment(id: string, initial: TensorState): ExperimentDef<TensorState, TensorResult> {
  const dim = (axis: number, label: string) =>
    ({
      kind: 'slider',
      id: `d${axis}`,
      label,
      min: 1,
      max: MAX_DIM,
      get: (s: TensorState) => s.shape[axis]!,
      set: (s: TensorState, n: number) => resized(s, axis, n),
    }) as const;
  return {
    id,
    initial,
    controls: [
      dim(0, 'Batch size b (axis 0)'),
      dim(1, 'Rows r (axis 1)'),
      dim(2, 'Columns c (axis 2)'),
      {
        kind: 'select',
        id: 'op',
        label: 'Operation',
        options: (Object.keys(OPS) as TensorOp[]).map((value) => ({ value, label: OPS[value].label })),
        get: (s) => s.op,
        set: (s, op) => ({ ...s, op: op as TensorOp }),
      },
    ],
    compute: (s) => ({
      x: arange3(s.shape),
      y: applyOp(s.op, s.shape),
      outShape: outputShape(s.op, s.shape),
      dest: destination(s.op, s.shape, s.focus),
      destOf: (i, j, k) => destination(s.op, s.shape, [i, j, k]),
    }),
    readout: (s, r) => [
      { label: 'Selected entry', value: `x[${s.focus.join(', ')}] → y[${r.dest.join(', ')}]` },
      { label: 'Size (entries)', value: `${s.shape.join('·')} = ${size(s.shape)}, unchanged` },
      { label: "print(x.shape, '->', y.shape)", value: `${tuple(s.shape)} -> ${tuple(r.outShape)}` },
      { label: 'print(y)', value: formatNumpyInt(r.y) },
    ],
  };
}

const st = (s: unknown) => s as TensorState;
export const tensorSlots = {
  size: (s: unknown) => String(size(st(s).shape)),
  shape: (s: unknown) => st(s).shape.join(', '),
  op: (s: unknown) => OPS[st(s).op].code(st(s).shape),
};
