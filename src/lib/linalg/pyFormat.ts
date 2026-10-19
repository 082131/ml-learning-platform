/**
 * Python and NumPy number printing, reproduced exactly so a readout can show what the code prints.
 * Every function is checked against CPython 3.13 and NumPy 2.5.3 output in pyFormat.test.ts.
 */

/** repr(float) / print(float) in Python: the shortest digits that round-trip, as Python lays them out. */
export function pyRepr(x: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  // toExponential() with no argument gives the shortest round-trip digits, as Python's repr does.
  const [mant, expText] = x.toExponential().split('e') as [string, string];
  const exp = Number(expText);
  const sign = mant.startsWith('-') ? '-' : '';
  const digits = mant.replace('-', '').replace('.', '');
  // Python switches to scientific notation below 1e-4 and from 1e16 on.
  if (exp < -4 || exp >= 16) {
    const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
    const e = `${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`;
    return `${sign}${m}e${e}`;
  }
  if (exp < 0) return `${sign}0.${'0'.repeat(-exp - 1)}${digits}`;
  const int = digits.slice(0, exp + 1).padEnd(exp + 1, '0');
  const frac = digits.slice(exp + 1);
  return `${sign}${int}.${frac || '0'}`;
}

/** The exact value of a finite double as mantissa × 2^exponent with a BigInt mantissa. */
function exactParts(x: number): { neg: boolean; mant: bigint; exp: number } {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const hi = view.getUint32(0);
  const lo = view.getUint32(4);
  const neg = hi >>> 31 === 1;
  const biased = (hi >>> 20) & 0x7ff;
  const frac = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  return biased === 0
    ? { neg, mant: frac, exp: -1074 }
    : { neg, mant: frac | (1n << 52n), exp: biased - 1075 };
}

/**
 * f"{x:.{d}f}" in Python: rounds the exact binary value half to even. (JavaScript's toFixed rounds
 * exact ties up, so 0.0078125.toFixed(6) differs from Python's '0.007812'.)
 */
export function pyFixed(x: number, d: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  const { neg, mant, exp } = exactParts(x);
  const scaled = mant * 10n ** BigInt(d);
  let q: bigint;
  if (exp >= 0) q = scaled << BigInt(exp);
  else {
    const den = 1n << BigInt(-exp);
    q = scaled / den;
    const twice = (scaled % den) * 2n;
    if (twice > den || (twice === den && q % 2n === 1n)) q += 1n;
  }
  const s = q.toString().padStart(d + 1, '0');
  const body = d === 0 ? s : `${s.slice(0, -d)}.${s.slice(-d)}`;
  return `${neg ? '-' : ''}${body}`;
}

/** A number as a Python literal: integers without a decimal point, others as repr. */
export function pyLiteral(x: number): string {
  return Number.isInteger(x) ? String(x) : pyRepr(x);
}

/** A list of numbers as a Python list literal, for example [3, 1.5]. */
export function pyListLiteral(xs: readonly number[]): string {
  return `[${xs.map(pyLiteral).join(', ')}]`;
}

const MAX_FIXED = 1e8;
const MIN_FIXED = 1e-4;
const MAX_RATIO = 1e3;

/** Fraction digits Python's repr needs for x (0 for whole numbers). */
function fractionDigits(x: number): string {
  const r = pyRepr(Math.abs(x));
  if (r.includes('e')) throw new Error(`numpyVector: ${r} needs scientific notation`);
  const frac = r.split('.')[1]!;
  return frac === '0' ? '' : frac;
}

/**
 * print(arr) for a 1-D NumPy array with default print options. `float` is the array's dtype: a float
 * array prints "3." for 3. Only the fixed-point layout is supported, which NumPy uses while every
 * nonzero |value| is in [1e-4, 1e8) and max/min ≤ 1000; anything else throws rather than guess.
 */
export function numpyVector(xs: readonly number[], float: boolean): string {
  if (!float) {
    if (xs.some((x) => !Number.isInteger(x))) throw new Error('numpyVector: an int array holds integers');
    const width = Math.max(...xs.map((x) => String(x).length));
    return `[${xs.map((x) => String(x).padStart(width)).join(' ')}]`;
  }
  const nonzero = xs.filter((x) => x !== 0).map(Math.abs);
  if (nonzero.length) {
    const [lo, hi] = [Math.min(...nonzero), Math.max(...nonzero)];
    if (hi >= MAX_FIXED || lo < MIN_FIXED || hi / lo > MAX_RATIO)
      throw new Error('numpyVector: NumPy would print these values in scientific notation');
  }
  const parts = xs.map((x) => {
    const int = (x < 0 || Object.is(x, -0) ? '-' : '') + String(Math.trunc(Math.abs(x)));
    return { int, frac: fractionDigits(x) };
  });
  const left = Math.max(...parts.map((p) => p.int.length));
  const right = Math.max(...parts.map((p) => p.frac.length));
  return `[${parts.map((p) => `${p.int.padStart(left)}.${p.frac.padEnd(right)}`).join(' ')}]`;
}
