import { pyFixed, pyLiteral } from '../linalg/pyFormat';
import { formatNumber } from '../trace/values';
import type { ExperimentDef } from '../types';

/** A function with its exact derivative. `python` and `dpython` are the bodies the lesson's code uses. */
export interface CalcFn {
  id: string;
  label: string;
  python: string;
  dpython: string;
  f: (x: number) => number;
  /** NaN where the derivative does not exist. */
  df: (x: number) => number;
}

// Written with * rather than ** so JavaScript and Python do the same floating-point operations.
export const CALC_FUNCTIONS: Record<string, CalcFn> = {
  square: {
    id: 'square',
    label: 'f(x) = x²',
    python: 'x * x',
    dpython: '2 * x',
    f: (x) => x * x,
    df: (x) => 2 * x,
  },
  cubic: {
    id: 'cubic',
    label: 'f(x) = x³ − 3x',
    python: 'x * x * x - 3 * x',
    dpython: '3 * x * x - 3',
    f: (x) => x * x * x - 3 * x,
    df: (x) => 3 * x * x - 3,
  },
  abs: {
    id: 'abs',
    label: 'f(x) = |x|',
    python: 'abs(x)',
    dpython: '1 if x > 0 else -1  # undefined at x = 0',
    f: (x) => Math.abs(x),
    df: (x) => (x === 0 ? NaN : Math.sign(x)),
  },
};

export const STEP_SIZES = ['1', '0.1', '0.01', '0.001', '1e-06', '1e-12'] as const;

/** (f(x + h) − f(x)) / h, in the same operation order as the Python code. */
export const forwardDifference = (f: (x: number) => number, x: number, h: number) => (f(x + h) - f(x)) / h;

/** (f(x + h) − f(x − h)) / (2h). Its error shrinks like h² instead of h for smooth functions. */
export const centralDifference = (f: (x: number) => number, x: number, h: number) =>
  (f(x + h) - f(x - h)) / (2 * h);

export interface DerivState {
  fn: string;
  x: number;
  /** One of STEP_SIZES, as written in the code. */
  h: string;
}
export interface DerivResult {
  fx: number;
  exact: number;
  forward: number;
  central: number;
}

export const X_RANGE = { min: -3, max: 3, step: 0.1 } as const;

/** Slope at a point: the tangent (exact derivative) against numerical estimates with step h. */
export function derivativeExperiment(
  id: string,
  initial: DerivState,
): ExperimentDef<DerivState, DerivResult> {
  const fnOf = (s: DerivState) => CALC_FUNCTIONS[s.fn] ?? CALC_FUNCTIONS.square!;
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'fn',
        label: 'Function',
        options: Object.values(CALC_FUNCTIONS).map((f) => ({ value: f.id, label: f.label })),
        get: (s) => s.fn,
        set: (s, fn) => ({ ...s, fn }),
      },
      {
        kind: 'slider',
        id: 'x',
        label: 'Point x',
        ...X_RANGE,
        get: (s) => s.x,
        set: (s, x) => ({ ...s, x: Math.round(x * 10) / 10 }),
        format: formatNumber,
      },
      {
        kind: 'select',
        id: 'h',
        label: 'Step h',
        options: STEP_SIZES.map((h) => ({ value: h, label: h })),
        get: (s) => s.h,
        set: (s, h) => ({ ...s, h }),
      },
    ],
    compute: (s) => {
      const { f, df } = fnOf(s);
      const h = Number(s.h);
      return {
        fx: f(s.x),
        exact: df(s.x),
        forward: forwardDifference(f, s.x, h),
        central: centralDifference(f, s.x, h),
      };
    },
    readout: (_s, r) => {
      const undefinedSlope = Number.isNaN(r.exact);
      const err = (v: number) => (undefinedSlope ? '' : `, error ${formatNumber(v - r.exact)}`);
      return [
        { label: 'f(x)', value: formatNumber(r.fx) },
        undefinedSlope
          ? { label: "f'(x)", value: 'undefined: the slope jumps from −1 to 1', status: 'error' }
          : { label: "f'(x), exact", value: formatNumber(r.exact) },
        { label: 'Forward difference', value: `${formatNumber(r.forward)}${err(r.forward)}` },
        { label: 'Central difference', value: `${formatNumber(r.central)}${err(r.central)}` },
        {
          label: 'print(...)',
          value: `${pyFixed(r.forward, 6)} ${pyFixed(r.central, 6)}`,
        },
      ];
    },
  };
}

const st = (s: unknown) => s as DerivState;
export const derivativeSlots = {
  f: (s: unknown) => (CALC_FUNCTIONS[st(s).fn] ?? CALC_FUNCTIONS.square!).python,
  x: (s: unknown) => pyLiteral(st(s).x),
  h: (s: unknown) => st(s).h,
};

/**
 * The part of the line through (x0, y0) with slope m that lies inside [xa, xb] × [ylo, yhi], as two
 * endpoints, or undefined if it misses the box. Used to draw tangents and secants without overflow.
 */
export function clipLine(
  x0: number,
  y0: number,
  m: number,
  [xa, xb]: [number, number],
  [ylo, yhi]: [number, number],
): [[number, number], [number, number]] | undefined {
  let lo = xa;
  let hi = xb;
  if (m !== 0) {
    const t1 = x0 + (ylo - y0) / m;
    const t2 = x0 + (yhi - y0) / m;
    lo = Math.max(lo, Math.min(t1, t2));
    hi = Math.min(hi, Math.max(t1, t2));
  } else if (y0 < ylo || y0 > yhi) return undefined;
  if (!(lo < hi)) return undefined;
  const at = (t: number): [number, number] => [t, y0 + m * (t - x0)];
  return [at(lo), at(hi)];
}
