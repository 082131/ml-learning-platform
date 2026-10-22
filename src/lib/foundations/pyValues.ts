import type { TraceValue } from '../types';
import { array, scalar, text } from '../trace/values';

/**
 * Python values for computed traces: a JS number is an int, `{ float }` a float, a string a str,
 * arrays are lists, `{ dict }` a dict with its items in insertion order, `null` None.
 */
export type Py = number | boolean | string | null | { float: number } | Py[] | { dict: [Py, Py][] };

export const float = (value: number): Py => ({ float: value });

/** Python's repr() of a float, for the values lessons use (|x| < 1e16 and not tiny): 9.0, 2.5, 0.1. */
export function floatRepr(x: number): string {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'nan' : x > 0 ? 'inf' : '-inf';
  if (Number.isInteger(x) && Math.abs(x) < 1e16) return x.toFixed(1);
  return String(x);
}

/** Python's repr() of a str: single quotes unless the text contains one and no double quote. */
export function strRepr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  const body = s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(new RegExp(q, 'g'), `\\${q}`);
  return `${q}${body}${q}`;
}

export function repr(v: Py): string {
  if (v === null) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return strRepr(v);
  if (Array.isArray(v)) return `[${v.map(repr).join(', ')}]`;
  if ('float' in v) return floatRepr(v.float);
  return `{${v.dict.map(([k, x]) => `${repr(k)}: ${repr(x)}`).join(', ')}}`;
}

/** Python's str(), which print() uses: like repr() except that a str prints without quotes. */
export const str = (v: Py) => (typeof v === 'string' ? v : repr(v));

/** Python's print(*values): str() of each, separated by spaces. */
export const pyPrint = (...values: Py[]) => values.map(str).join(' ');

/** The type name Python reports: <class 'int'>. */
export function typeName(v: Py): string {
  if (v === null) return 'NoneType';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'number') return 'int';
  if (typeof v === 'string') return 'str';
  if (Array.isArray(v)) return 'list';
  return 'float' in v ? 'float' : 'dict';
}

const isInt = (v: Py): v is number => typeof v === 'number';

/**
 * How a value shows in the variables panel. Ints are numbers and lists of ints are arrays (with a
 * shape); everything else, floats included, shows as its repr(), so 9.0 never looks like the int 9.
 */
export function toTrace(v: Py): TraceValue {
  if (isInt(v)) return scalar(v);
  if (Array.isArray(v) && v.length > 0 && v.every(isInt)) return array(v);
  return text(repr(v));
}

export const traceVars = (vars: Record<string, Py>) =>
  Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, toTrace(v)]));
