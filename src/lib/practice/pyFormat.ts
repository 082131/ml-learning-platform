/**
 * Python-compatible formatting, so a readout can show exactly what the lesson's Python prints.
 * Checked against CPython 3.13 output in pyFormat.test.ts.
 */

const ROUND_DIGITS = 4;
/** Python's repr switches to exponent notation at 1e16; values here stay far below it. */
const REPR_LIMIT = 1e16;

/** Enough digits for the exact decimal expansion of any double the lessons round (|x| ≥ 2^-40). */
const EXACT_DIGITS = 100;

/**
 * Python's `round(x, digits)`: rounds the exact binary value, and an exact tie goes to the even
 * digit (`round(0.03125, 4)` is 0.0312). `toFixed` alone would round that tie up.
 */
export function pyRound(x: number, digits = ROUND_DIGITS): number {
  if (!Number.isFinite(x) || x === 0) return x;
  const [whole, frac = ''] = Math.abs(x).toFixed(EXACT_DIGITS).split('.');
  const kept = BigInt(whole! + frac.slice(0, digits));
  const next = frac[digits] ?? '0';
  const rest = frac.slice(digits + 1);
  const tie = next === '5' && !/[1-9]/.test(rest);
  const up = next > '5' || (next === '5' && !tie) || (tie && kept % 2n === 1n);
  const scaled = (kept + (up ? 1n : 0n)).toString().padStart(digits + 1, '0');
  const text = `${scaled.slice(0, -digits || undefined)}.${scaled.slice(-digits)}`;
  return Math.sign(x) * Number(text);
}

/** Python's `repr(float)`: the shortest round-trip digits, with a trailing `.0` for whole numbers. */
export function pyFloat(x: number): string {
  if (Number.isNaN(x)) return 'nan';
  if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
  if (Math.abs(x) >= REPR_LIMIT) throw new Error(`pyFloat: ${x} would use exponent notation`);
  if (Object.is(x, -0)) return '-0.0';
  const s = String(x);
  return Number.isInteger(x) ? `${s}.0` : s;
}

/** A value that `json.dumps` can print: floats, ints (marked with `int`), strings, null, lists and dicts. */
export type PyValue =
  number | { int: number } | string | null | boolean | PyValue[] | { [k: string]: PyValue };

const isInt = (v: object): v is { int: number } => 'int' in v && Object.keys(v).length === 1;

/** Python's `json.dumps(value)` with default separators (", " and ": "), keys in insertion order. */
export function pyJson(v: PyValue): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number')
    return Number.isNaN(v) ? 'NaN' : Number.isFinite(v) ? pyFloat(v) : v > 0 ? 'Infinity' : '-Infinity';
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(pyJson).join(', ')}]`;
  if (isInt(v)) return String(v.int);
  return `{${Object.entries(v)
    .map(([k, x]) => `${JSON.stringify(k)}: ${pyJson(x)}`)
    .join(', ')}}`;
}
