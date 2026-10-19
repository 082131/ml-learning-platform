import { DIVERGENCE_LIMIT, isFiniteOrDiverged } from '../math/numeric';
import { formatNumber } from '../trace/values';
import type { ExperimentDef } from '../types';

/** A one-variable function with its derivative, for gradient descent demos. */
export interface Fn1D {
  id: string;
  label: string;
  /** Plain-text formula, also valid Python for the code panel, for example `(x - 2) ** 2 + 1`. */
  python: string;
  f: (x: number) => number;
  df: (x: number) => number;
  /** x range to plot. */
  domain: [number, number];
}

/** f(x) = (x − 2)² + 1: one minimum at x = 2, f(2) = 1. f''(x) = 2, so steps diverge when η > 1. */
export const QUADRATIC: Fn1D = {
  id: 'quadratic',
  label: 'Convex: (x − 2)² + 1',
  python: '(x - 2) ** 2 + 1',
  f: (x) => (x - 2) ** 2 + 1,
  df: (x) => 2 * (x - 2),
  domain: [-3, 7],
};

/** f(x) = x⁴ − 3x² + x + 3: a global minimum near x = −1.30 and a local one near x = 1.13. */
export const NON_CONVEX: Fn1D = {
  id: 'non-convex',
  label: 'Non-convex: x⁴ − 3x² + x + 3',
  python: 'x ** 4 - 3 * x ** 2 + x + 3',
  f: (x) => x ** 4 - 3 * x ** 2 + x + 3,
  df: (x) => 4 * x ** 3 - 6 * x + 1,
  domain: [-2.2, 2.2],
};

export const FUNCTIONS: Record<string, Fn1D> = { [QUADRATIC.id]: QUADRATIC, [NON_CONVEX.id]: NON_CONVEX };

export interface GDStep {
  /** Step number k, starting at 0. */
  k: number;
  x: number;
  fx: number;
  grad: number;
  /** x after this step: x − η·f'(x). */
  next: number;
}

export interface GDRun {
  steps: GDStep[];
  /** Every x visited, including the final one (steps.length + 1 values unless it diverged). */
  xs: number[];
  status: 'ok' | 'diverged';
  /** The step whose update left the safe range. */
  divergedAt?: number;
}

/**
 * Plain gradient descent, x ← x − η·f'(x), for `steps` updates. Stops at the first step whose new x
 * or f(x) is NaN, infinite or beyond DIVERGENCE_LIMIT and reports it as diverged.
 */
export function runGradientDescent(fn: Fn1D, x0: number, lr: number, steps: number): GDRun {
  const out: GDStep[] = [];
  const xs = [x0];
  let x = x0;
  for (let k = 0; k < steps; k++) {
    const fx = fn.f(x);
    const grad = fn.df(x);
    const next = x - lr * grad;
    out.push({ k, x, fx, grad, next });
    if (isFiniteOrDiverged(next) === 'diverged' || isFiniteOrDiverged(fn.f(next)) === 'diverged')
      return { steps: out, xs, status: 'diverged', divergedAt: k };
    xs.push(next);
    x = next;
  }
  return { steps: out, xs, status: 'ok' };
}

/** "x₁ = x₀ − η·f'(x₀) = 6 − 0.25 × 8 = 4": the arithmetic of one update, with the numbers used. */
export function describeStep(step: GDStep, lr: number): string {
  const n = formatNumber;
  const sub = (k: number) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]!);
  const result =
    isFiniteOrDiverged(step.next) === 'finite' ? n(step.next) : `${step.next.toExponential(2)} (diverged)`;
  const grad = step.grad < 0 ? `(${n(step.grad)})` : n(step.grad);
  return `x${sub(step.k + 1)} = x${sub(step.k)} − η·f'(x${sub(step.k)}) = ${n(step.x)} − ${n(lr)} × ${grad} = ${result}`;
}

export interface GDState {
  fn: string;
  lr: number;
  x0: number;
  steps: number;
  /** The step whose arithmetic is shown. Clamped to the steps that ran. */
  inspect: number;
}

export const MAX_STEPS = 50;

/** An experiment for GradientDescent1D: function, learning rate, start, number of steps and the inspected step. */
export function gradientDescentExperiment(
  id: string,
  initial: Partial<GDState> = {},
): ExperimentDef<GDState, GDRun> {
  const fnOf = (s: GDState) => FUNCTIONS[s.fn] ?? QUADRATIC;
  return {
    id,
    initial: { fn: QUADRATIC.id, lr: 0.1, x0: 6, steps: 20, inspect: 0, ...initial },
    controls: [
      {
        kind: 'select',
        id: 'fn',
        label: 'Function',
        options: Object.values(FUNCTIONS).map((f) => ({ value: f.id, label: f.label })),
        get: (s) => s.fn,
        set: (s, fn) => ({
          ...s,
          fn,
          x0: Math.min(Math.max(s.x0, FUNCTIONS[fn]!.domain[0]), FUNCTIONS[fn]!.domain[1]),
        }),
      },
      {
        kind: 'slider',
        id: 'lr',
        label: 'Learning rate η',
        min: 0.01,
        max: 1.5,
        step: 0.01,
        get: (s) => s.lr,
        set: (s, lr) => ({ ...s, lr }),
      },
      {
        kind: 'slider',
        id: 'x0',
        label: 'Start x₀',
        min: -3,
        max: 7,
        step: 0.1,
        get: (s) => s.x0,
        set: (s, x0) => ({ ...s, x0 }),
        format: formatNumber,
      },
      {
        kind: 'slider',
        id: 'steps',
        label: 'Steps',
        min: 1,
        max: MAX_STEPS,
        get: (s) => s.steps,
        set: (s, steps) => ({ ...s, steps, inspect: Math.min(s.inspect, steps - 1) }),
      },
      {
        kind: 'slider',
        id: 'inspect',
        label: 'Inspect step',
        min: 0,
        max: MAX_STEPS - 1,
        get: (s) => s.inspect,
        set: (s, inspect) => ({ ...s, inspect: Math.min(inspect, s.steps - 1) }),
      },
    ],
    compute: (s) => runGradientDescent(fnOf(s), s.x0, s.lr, s.steps),
    readout: (s, r) => {
      const last = r.xs.at(-1)!;
      return r.status === 'diverged'
        ? [
            {
              label: 'Status',
              value: `x left ±${DIVERGENCE_LIMIT.toExponential(0)} at step ${r.divergedAt! + 1}`,
              status: 'diverged',
            },
          ]
        : [
            { label: `x after ${r.steps.length} steps`, value: formatNumber(last) },
            { label: 'f(x)', value: formatNumber(fnOf(s).f(last)) },
            { label: "f'(x)", value: formatNumber(fnOf(s).df(last)) },
          ];
    },
  };
}
