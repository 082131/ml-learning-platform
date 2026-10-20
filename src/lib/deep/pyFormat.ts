/**
 * Python's own number formatting, so readouts can show exactly what a lesson's code prints.
 * Checked against CPython 3.13 and NumPy 2.5.3 in pyFormat.test.ts.
 */

/** Digits after the point that toFixed can still produce, used to detect exact decimal ties. */
const TIE_DIGITS = 40;

/**
 * Python's f"{x:.{d}f}". JavaScript's toFixed also rounds the exact binary value, but breaks exact
 * ties away from zero, while Python rounds them to even (f"{0.03125:.4f}" is '0.0312').
 */
export function pyFixed(x: number, d: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  const neg = x < 0 || Object.is(x, -0);
  const ax = Math.abs(x);
  const long = ax.toFixed(Math.min(100, d + TIE_DIGITS));
  const tail = long.slice(long.indexOf('.') + 1 + d);
  let out = ax.toFixed(d);
  if (/^50*$/.test(tail)) {
    // Exact tie: toFixed rounded up; step back down when that made the last digit odd.
    const down = (Math.floor(ax * 10 ** d) / 10 ** d).toFixed(d);
    const lastUp = Number(out.at(-1));
    if (lastUp % 2 === 1) out = down;
  }
  return neg ? `-${out}` : out;
}

/** Python's repr(float): the shortest round-trip digits, positional for exponents -4 to 15. */
export function pyRepr(x: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  const [mant, expText] = x.toExponential().split('e') as [string, string];
  const exp = Number(expText);
  if (exp < -4 || exp >= 16) {
    const sign = exp < 0 ? '-' : '+';
    return `${mant}e${sign}${String(Math.abs(exp)).padStart(2, '0')}`;
  }
  const neg = mant.startsWith('-');
  const digits = mant.replace('-', '').replace('.', '');
  const point = exp + 1; // digits before the decimal point
  let body: string;
  if (point <= 0) body = `0.${'0'.repeat(-point)}${digits}`;
  else if (point >= digits.length) body = `${digits}${'0'.repeat(point - digits.length)}.0`;
  else body = `${digits.slice(0, point)}.${digits.slice(point)}`;
  return neg ? `-${body}` : body;
}

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
