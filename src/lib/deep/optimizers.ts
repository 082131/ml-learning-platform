/**
 * Gradient descent, momentum and Adam on 2-D loss surfaces, for the optimizer race.
 * The update rules follow PyTorch's torch.optim.SGD (with and without momentum, no dampening or
 * Nesterov) and torch.optim.Adam (no weight decay, no AMSGrad).
 */
import { isFiniteOrDiverged } from '../math/numeric';

export type Vec2 = [number, number];

export interface Surface {
  id: 'bowl' | 'rosenbrock';
  label: string;
  /** The loss and its gradient, as Python expressions in x and y (for the code panel). */
  python: { f: string; grad: string };
  /** The formula for prose and captions. */
  formula: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => Vec2;
  x: [number, number];
  y: [number, number];
  start: Vec2;
  minimum: Vec2;
  /** Contour levels drawn on the plot. */
  levels: number[];
  /** Settings that make a sensible first race on this surface. */
  defaults: { lr: number; adamLr: number; steps: number };
}

/** f = ½(x² + 10y²): a bowl 10 times steeper along y than along x. Minimum 0 at (0, 0). */
export const BOWL: Surface = {
  id: 'bowl',
  label: 'Elongated bowl: ½(x² + 10y²)',
  python: { f: '0.5 * (x ** 2 + 10 * y ** 2)', grad: '[x, 10 * y]' },
  formula: 'f(x, y) = ½(x² + 10y²)',
  f: (x, y) => 0.5 * (x * x + 10 * y * y),
  grad: (x, y) => [x, 10 * y],
  x: [-5, 5],
  y: [-2.5, 2.5],
  start: [-4, 1.5],
  minimum: [0, 0],
  levels: [0.05, 0.25, 1, 2.5, 5, 10, 20, 35],
  defaults: { lr: 0.05, adamLr: 0.2, steps: 60 },
};

/** Rosenbrock's banana: f = (1 − x)² + 100(y − x²)². A curved, flat-bottomed valley; minimum 0 at (1, 1). */
export const ROSENBROCK: Surface = {
  id: 'rosenbrock',
  label: 'Rosenbrock valley: (1 − x)² + 100(y − x²)²',
  python: {
    f: '(1 - x) ** 2 + 100 * (y - x ** 2) ** 2',
    grad: '[-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)]',
  },
  formula: 'f(x, y) = (1 − x)² + 100(y − x²)²',
  f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
  grad: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  x: [-2, 2],
  y: [-1, 3],
  start: [-1.2, 1],
  minimum: [1, 1],
  levels: [0.1, 0.5, 2, 5, 15, 40, 100, 250, 600],
  defaults: { lr: 0.001, adamLr: 0.1, steps: 400 },
};

export const SURFACES: Record<Surface['id'], Surface> = { bowl: BOWL, rosenbrock: ROSENBROCK };
export const surfaceOf = (id: string): Surface => SURFACES[id as Surface['id']] ?? BOWL;

export type OptimizerId = 'sgd' | 'momentum' | 'adam';
export const OPTIMIZER_IDS: OptimizerId[] = ['sgd', 'momentum', 'adam'];
export const OPTIMIZER_LABEL: Record<OptimizerId, string> = {
  sgd: 'Gradient descent (SGD)',
  momentum: 'Momentum',
  adam: 'Adam',
};

export interface Hyper {
  /** Learning rate η for SGD and momentum. */
  lr: number;
  /** Momentum coefficient β. */
  beta: number;
  /** Adam's learning rate (Adam's steps are about η long, so it needs its own). */
  adamLr: number;
  beta1: number;
  beta2: number;
  eps: number;
}

export const ADAM_EPS = 1e-8;

/** One update t (1-based), with every intermediate the lesson shows. Vectors are (x, y) pairs. */
export interface OptStep {
  t: number;
  /** Position before the update and the loss there. */
  theta: Vec2;
  f: number;
  g: Vec2;
  /** Momentum: the velocity buffer after this step. Adam: the first moment m after this step. */
  m?: Vec2;
  /** Adam: the second moment v, and the bias-corrected m̂ and v̂, after this step. */
  v?: Vec2;
  mHat?: Vec2;
  vHat?: Vec2;
  /** What is subtracted from θ: η·g, η·velocity, or η·m̂ / (√v̂ + ε). */
  delta: Vec2;
  next: Vec2;
}

export interface OptRun {
  id: OptimizerId;
  steps: OptStep[];
  /** Every position visited, starting with the start point (steps.length + 1 unless it diverged). */
  path: Vec2[];
  status: 'ok' | 'diverged';
  /** 1-based number of the update that left the safe numeric range. */
  divergedAt?: number;
}

const map2 = (a: Vec2, fn: (v: number, i: number) => number): Vec2 => [fn(a[0], 0), fn(a[1], 1)];

/** Runs one optimizer from the surface's start point for `steps` updates, stopping if it diverges. */
export function runOptimizer(surface: Surface, id: OptimizerId, h: Hyper, steps: number): OptRun {
  let theta: Vec2 = [...surface.start];
  let m: Vec2 = [0, 0];
  let v: Vec2 = [0, 0];
  const out: OptStep[] = [];
  const path: Vec2[] = [theta];
  for (let t = 1; t <= steps; t++) {
    const g = surface.grad(...theta);
    const f = surface.f(...theta);
    let step: OptStep;
    if (id === 'sgd') {
      const delta = map2(g, (gi) => h.lr * gi);
      step = { t, theta, f, g, delta, next: map2(theta, (x, i) => x - delta[i]!) };
    } else if (id === 'momentum') {
      m = map2(g, (gi, i) => h.beta * m[i]! + gi);
      const delta = map2(m, (mi) => h.lr * mi);
      step = { t, theta, f, g, m, delta, next: map2(theta, (x, i) => x - delta[i]!) };
    } else {
      m = map2(g, (gi, i) => h.beta1 * m[i]! + (1 - h.beta1) * gi);
      v = map2(g, (gi, i) => h.beta2 * v[i]! + (1 - h.beta2) * gi * gi);
      const mHat = map2(m, (mi) => mi / (1 - h.beta1 ** t));
      const vHat = map2(v, (vi) => vi / (1 - h.beta2 ** t));
      const delta = map2(mHat, (mh, i) => (h.adamLr * mh) / (Math.sqrt(vHat[i]!) + h.eps));
      step = { t, theta, f, g, m, v, mHat, vHat, delta, next: map2(theta, (x, i) => x - delta[i]!) };
    }
    out.push(step);
    const bad = [...step.next, surface.f(...step.next)].some((x) => isFiniteOrDiverged(x) === 'diverged');
    if (bad) return { id, steps: out, path, status: 'diverged', divergedAt: t };
    theta = step.next;
    path.push(theta);
  }
  return { id, steps: out, path, status: 'ok' };
}

/** Distance from a point to the surface's minimum. */
export const distanceToMin = (s: Surface, p: Vec2) => Math.hypot(p[0] - s.minimum[0], p[1] - s.minimum[1]);

/** Numbers for the equations: up to 4 decimals, scientific notation for tiny or huge magnitudes. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return Number.isNaN(n) ? 'NaN' : n > 0 ? '∞' : '−∞';
  const a = Math.abs(n);
  const s = a !== 0 && (a < 1e-3 || a >= 1e6) ? n.toExponential(2) : String(Number(n.toFixed(4)));
  return s.replaceAll('-', '−');
}
export const fmtVec = (p: readonly number[]) => `(${p.map(fmt).join(', ')})`;

/** One line of the inspected update: the rule in symbols, then with the numbers filled in. */
export interface EquationLine {
  symbol: string;
  numbers: string;
}

/**
 * The update equations of step `s` with its numbers. `prev` is the optimizer state before the step
 * (the previous step's m and v, or zeros at t = 1).
 */
export function describeUpdate(
  id: OptimizerId,
  s: OptStep,
  prev: OptStep | undefined,
  h: Hyper,
): EquationLine[] {
  const g = { symbol: 'g = ∇f(θ)', numbers: `∇f${fmtVec(s.theta)} = ${fmtVec(s.g)}` };
  const theta = (rate: number, what: string, d: Vec2) => ({
    symbol: `θ ← θ − ${what}`,
    numbers: `${fmtVec(s.theta)} − ${fmt(rate)}·${fmtVec(d)} = ${fmtVec(s.next)}`,
  });
  if (id === 'sgd') return [g, theta(h.lr, 'η·g', s.g)];
  const m0: Vec2 = prev?.m ?? [0, 0];
  if (id === 'momentum')
    return [
      g,
      { symbol: 'u ← β·u + g', numbers: `${fmt(h.beta)}·${fmtVec(m0)} + ${fmtVec(s.g)} = ${fmtVec(s.m!)}` },
      theta(h.lr, 'η·u', s.m!),
    ];
  const v0: Vec2 = prev?.v ?? [0, 0];
  const c1 = 1 - h.beta1 ** s.t;
  const c2 = 1 - h.beta2 ** s.t;
  const ratio = map2(s.mHat!, (mh, i) => mh / (Math.sqrt(s.vHat![i]!) + h.eps));
  return [
    g,
    {
      symbol: 'm ← β₁·m + (1 − β₁)·g',
      numbers: `${fmt(h.beta1)}·${fmtVec(m0)} + ${fmt(1 - h.beta1)}·${fmtVec(s.g)} = ${fmtVec(s.m!)}`,
    },
    {
      symbol: 'v ← β₂·v + (1 − β₂)·g²',
      numbers: `${fmt(h.beta2)}·${fmtVec(v0)} + ${fmt(1 - h.beta2)}·${fmtVec(map2(s.g, (x) => x * x))} = ${fmtVec(s.v!)}`,
    },
    { symbol: `m̂ = m / (1 − β₁^${s.t})`, numbers: `${fmtVec(s.m!)} / ${fmt(c1)} = ${fmtVec(s.mHat!)}` },
    { symbol: `v̂ = v / (1 − β₂^${s.t})`, numbers: `${fmtVec(s.v!)} / ${fmt(c2)} = ${fmtVec(s.vHat!)}` },
    theta(h.adamLr, 'η·m̂ / (√v̂ + ε)', ratio),
  ];
}
