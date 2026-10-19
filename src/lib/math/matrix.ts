export type Matrix = readonly (readonly number[])[];

/** A shape problem, with a message that names the shapes involved (shown to learners). */
export class ShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShapeError';
  }
}

/** (rows, columns). Throws for an empty or ragged matrix. */
export function shapeOf(m: Matrix): [number, number] {
  const rows = m.length;
  const cols = m[0]?.length ?? 0;
  if (rows === 0 || cols === 0) throw new ShapeError('A matrix needs at least one row and one column.');
  const bad = m.findIndex((r) => r.length !== cols);
  if (bad !== -1)
    throw new ShapeError(
      `Row ${bad} has ${m[bad]!.length} entries but row 0 has ${cols}: rows must be equal length.`,
    );
  return [rows, cols];
}

export const formatShape = ([r, c]: readonly number[]) => `(${r}, ${c})`;

/** A rows × cols matrix filled with `value`. */
export function filled(rows: number, cols: number, value = 0): number[][] {
  return Array.from({ length: rows }, () => Array<number>(cols).fill(value));
}

export function column(m: Matrix, j: number): number[] {
  return m.map((row) => row[j]!);
}

export function transpose(m: Matrix): number[][] {
  const [rows, cols] = shapeOf(m);
  return Array.from({ length: cols }, (_, j) => Array.from({ length: rows }, (_, i) => m[i]![j]!));
}

export function addMatrices(a: Matrix, b: Matrix): number[][] {
  const sa = shapeOf(a);
  const sb = shapeOf(b);
  if (sa[0] !== sb[0] || sa[1] !== sb[1])
    throw new ShapeError(`Can't add ${formatShape(sa)} and ${formatShape(sb)}: shapes must be equal.`);
  return a.map((row, i) => row.map((x, j) => x + b[i]![j]!));
}

/** Throws unless A's column count equals B's row count. Returns the result shape (rows of A, columns of B). */
export function matmulShape(a: Matrix, b: Matrix): [number, number] {
  const [m, n] = shapeOf(a);
  const [n2, p] = shapeOf(b);
  if (n !== n2)
    throw new ShapeError(
      `Can't multiply ${formatShape([m, n])} by ${formatShape([n2, p])}: A has ${n} columns but B has ${n2} rows.`,
    );
  return [m, p];
}

/** C = A B, where C[i][j] = Σₖ A[i][k] · B[k][j]. */
export function matmul(a: Matrix, b: Matrix): number[][] {
  const [m, p] = matmulShape(a, b);
  const n = a[0]!.length;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += a[i]![k]! * b[k]![j]!;
      return sum;
    }),
  );
}

/**
 * Returns a rows × cols copy of m: existing entries keep their position, new entries come from
 * `fill(i, j)`. Used when a learner changes a matrix's shape without losing the values they typed.
 */
export function resize(
  m: Matrix,
  rows: number,
  cols: number,
  fill: (i: number, j: number) => number = () => 0,
) {
  return Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => m[i]?.[j] ?? fill(i, j)),
  );
}

/** Replaces one entry, returning a new matrix. */
export function withEntry(m: Matrix, i: number, j: number, value: number): number[][] {
  return m.map((row, r) => (r === i ? row.map((x, c) => (c === j ? value : x)) : [...row]));
}
