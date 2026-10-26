import { pyFixed, pyRepr } from '../linalg/pyFormat';
import { isFiniteOrDiverged } from '../math/numeric';
import { formatNumber } from '../trace/values';
import type { ExperimentDef } from '../types';

/**
 * Gradient descent on the mean squared error of a line ŷ = w·x + b fitted to four points. The loss is a
 * bowl over (w, b) whose level sets are ellipses, so it can be drawn exactly as a contour map.
 */
export const XS = [0, 1, 2, 3];
export const YS = [1, 2, 5, 6];
/** Least-squares solution and its loss, worked out in the lesson. */
export const BEST = { w: 1.8, b: 0.8, loss: 0.2 };

/**
 * Python's built-in sum over floats (CPython 3.12+): Neumaier's compensated summation, which the linked
 * code uses. Reproduced so the readout matches the printout to the last digit.
 */
export function pySum(values: readonly number[]): number {
  let total = 0;
  let c = 0;
  for (const x of values) {
    const t = total + x;
    c += Math.abs(total) >= Math.abs(x) ? total - t + x : x - t + total;
    total = t;
  }
  return c !== 0 && Number.isFinite(c) ? total + c : total;
}

/** The loss and gradient, with the same operations in the same order as the Python code. */
export function lossAt(w: number, b: number): number {
  return pySum(XS.map((x, i) => (w * x + b - YS[i]!) * (w * x + b - YS[i]!))) / XS.length;
}

export function gradientAt(w: number, b: number): [number, number] {
  const errs = XS.map((x, i) => w * x + b - YS[i]!);
  return [(2 * pySum(errs.map((e, i) => e * XS[i]!))) / XS.length, (2 * pySum(errs)) / XS.length];
}

export interface Step2D {
  k: number;
  w: number;
  b: number;
  loss: number;
  dw: number;
  db: number;
}

export interface Run2D {
  /** One entry per update, holding the point before it. */
  steps: Step2D[];
  /** Every (w, b) visited, including the final one. */
  path: [number, number][];
  finalLoss: number;
  /** 'up' when the loss ended higher than it started (the learning rate is too large). */
  status: 'ok' | 'up';
}

export function runDescent2D(w0: number, b0: number, lr: number, steps: number): Run2D {
  let w = w0;
  let b = b0;
  const out: Step2D[] = [];
  const path: [number, number][] = [[w, b]];
  for (let k = 0; k < steps; k++) {
    const [dw, db] = gradientAt(w, b);
    out.push({ k, w, b, loss: lossAt(w, b), dw, db });
    w = w - lr * dw;
    b = b - lr * db;
    path.push([w, b]);
  }
  const finalLoss = lossAt(w, b);
  return { steps: out, path, finalLoss, status: finalLoss > lossAt(w0, b0) ? 'up' : 'ok' };
}

/**
 * Points on the level set loss = level. The loss is BEST.loss + dᵀ A d with d = (w, b) − best and
 * A = (1/n)[[Σx², Σx], [Σx, n]], so each level set is an ellipse along A's eigenvectors.
 */
export function levelSet(level: number, samples = 72): [number, number][] {
  const n = XS.length;
  const a = XS.reduce((s, x) => s + x * x, 0) / n;
  const c = XS.reduce((s, x) => s + x, 0) / n;
  const d = 1;
  const mid = (a + d) / 2;
  const rad = Math.sqrt(((a - d) / 2) ** 2 + c * c);
  const l1 = mid + rad;
  const l2 = mid - rad;
  // Eigenvector of l1: (c, l1 − a), normalized; l2's is perpendicular.
  const len = Math.hypot(c, l1 - a);
  const v1: [number, number] = [c / len, (l1 - a) / len];
  const v2: [number, number] = [-v1[1], v1[0]];
  const k = level - BEST.loss;
  if (k <= 0) return [[BEST.w, BEST.b]];
  const r1 = Math.sqrt(k / l1);
  const r2 = Math.sqrt(k / l2);
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = (2 * Math.PI * i) / samples;
    return [
      BEST.w + r1 * Math.cos(t) * v1[0] + r2 * Math.sin(t) * v2[0],
      BEST.b + r1 * Math.cos(t) * v1[1] + r2 * Math.sin(t) * v2[1],
    ];
  });
}

export const CONTOUR_LEVELS = [0.5, 1, 2, 4, 8, 16, 32];
/** Plotted ranges, in a 3 : 4 ratio so the contour map can use one scale for both axes. */
export const W_DOMAIN: [number, number] = [-2, 4];
export const B_DOMAIN: [number, number] = [-2, 6];
export const MAX_STEPS_2D = 100;

export interface Descent2DState {
  lr: number;
  w0: number;
  b0: number;
  steps: number;
  inspect: number;
}

/** print(round(w, 4), round(b, 4), round(loss, 4)) in Python. */
export function printRounded(...xs: number[]): string {
  return xs.map((x) => (Number.isFinite(x) ? pyRepr(Number(pyFixed(x, 4))) : pyRepr(x))).join(' ');
}

const st = (s: unknown) => s as Descent2DState;
/** Slot values as Python float literals, so the code does float arithmetic from the first step. */
const floatLiteral = (x: number) => pyRepr(x);
export const descentSlots = {
  w0: (s: unknown) => floatLiteral(st(s).w0),
  b0: (s: unknown) => floatLiteral(st(s).b0),
  lr: (s: unknown) => pyRepr(st(s).lr),
  steps: (s: unknown) => String(st(s).steps),
};

export function descent2DExperiment(
  id: string,
  initial: Descent2DState,
): ExperimentDef<Descent2DState, Run2D> {
  return {
    id,
    initial,
    controls: [
      {
        kind: 'slider',
        id: 'lr',
        label: 'Learning rate η',
        min: 0.01,
        max: 0.3,
        step: 0.01,
        get: (s) => s.lr,
        // Snap to k/100, the same double as the literal shown in the code.
        set: (s, lr) => ({ ...s, lr: Math.round(lr * 100) / 100 }),
      },
      {
        kind: 'slider',
        id: 'w0',
        label: 'Start w',
        min: W_DOMAIN[0],
        max: W_DOMAIN[1],
        step: 0.5,
        get: (s) => s.w0,
        set: (s, w0) => ({ ...s, w0 }),
      },
      {
        kind: 'slider',
        id: 'b0',
        label: 'Start b',
        min: B_DOMAIN[0],
        max: B_DOMAIN[1],
        step: 0.5,
        get: (s) => s.b0,
        set: (s, b0) => ({ ...s, b0 }),
      },
      {
        kind: 'slider',
        id: 'steps',
        label: 'Steps',
        min: 1,
        max: MAX_STEPS_2D,
        get: (s) => s.steps,
        set: (s, steps) => ({ ...s, steps, inspect: Math.min(s.inspect, steps - 1) }),
      },
      {
        kind: 'slider',
        id: 'inspect',
        label: 'Inspect step',
        min: 0,
        max: MAX_STEPS_2D - 1,
        get: (s) => s.inspect,
        set: (s, inspect) => ({ ...s, inspect: Math.min(inspect, s.steps - 1) }),
      },
    ],
    compute: (s) => runDescent2D(s.w0, s.b0, s.lr, s.steps),
    readout: (s, r) => {
      const [w, b] = r.path.at(-1)!;
      const [dw, db] = gradientAt(w, b);
      const blown = isFiniteOrDiverged(r.finalLoss) === 'diverged';
      return [
        r.status === 'up'
          ? {
              label: 'Status',
              value: `Loss went up, from ${formatNumber(lossAt(s.w0, s.b0))} to ${blown ? r.finalLoss.toExponential(2) : formatNumber(r.finalLoss)}: η is too large`,
              status: 'diverged' as const,
            }
          : { label: `Loss after ${s.steps} steps`, value: formatNumber(r.finalLoss) },
        { label: '(w, b)', value: blown ? 'diverged' : `(${formatNumber(w)}, ${formatNumber(b)})` },
        { label: 'Gradient length ‖∇L‖', value: blown ? 'diverged' : formatNumber(Math.hypot(dw, db)) },
        { label: 'What the code prints', value: printRounded(w, b, r.finalLoss) },
      ];
    },
  };
}
