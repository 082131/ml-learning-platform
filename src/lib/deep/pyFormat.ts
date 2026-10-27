/**
 * Python and NumPy number formatting for the deep learning lessons, so readouts show exactly what
 * the code prints. Checked against CPython 3.13 and NumPy 2.5.3 in pyFormat.test.ts.
 */
import { pyRepr } from '../linalg/pyFormat';

// repr(float) and f"{x:.df}" already live in lib/linalg; re-exported so deep lessons import one module.
export { pyFixed, pyRepr } from '../linalg/pyFormat';

/** Round half to even, as C's rint does in the default rounding mode. */
export function rint(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** NumPy's x.round(d) for float64: multiply by 10^d, rint, divide (numpy/_core/src/umath). */
export function npRound(x: number, d: number): number {
  const f = 10 ** d;
  return rint(x * f) / f;
}

/** A 2-D float array as Python prints `arr.tolist()`: [[0.1, 2.0], [3.5, -1.0]]. */
export function pyFloatList(m: readonly (readonly number[])[]): string {
  return `[${m.map((row) => `[${row.map(pyRepr).join(', ')}]`).join(', ')}]`;
}

/** A 1-D float list, as Python prints a list of floats: [0.5, -1.0]. */
export const pyFloatVector = (v: readonly number[]) => `[${v.map(pyRepr).join(', ')}]`;
