/**
 * Simple linear regression (one feature): predictions, residuals, mean squared error, the
 * least-squares (closed-form) fit and batch gradient descent, for the ml/classical/linear-regression lesson.
 */
import { isFiniteOrDiverged } from '../math/numeric';
import { PENGUINS, type Species } from './penguins';

/** One example: x = flipper length in cm, y = body mass in kg. */
export interface RegPoint {
  /** 0-based row of penguins.csv. */
  row: number;
  species: Species;
  x: number;
  y: number;
}

/**
 * Rows of penguins.csv used by the lesson: every 29th penguin that has both a flipper length and a
 * body mass (rows with missing values are skipped before counting), 12 penguins of all three species.
 */
export const REGRESSION_ROWS = [0, 30, 59, 88, 117, 146, 175, 204, 233, 262, 292, 321] as const;

/** The lesson's 12 penguins, in centimetres and kilograms so slopes and intercepts stay small numbers. */
export function regressionSubset(): RegPoint[] {
  return REGRESSION_ROWS.map((row) => {
    const p = PENGUINS[row]!;
    if (p.flipper_length_mm === null || p.body_mass_g === null)
      throw new Error(`Row ${row} has missing values`);
    return { row, species: p.species, x: p.flipper_length_mm / 10, y: p.body_mass_g / 1000 };
  });
}

/** ŷ = w·x + b, written as Python evaluates `w * x + b`. */
export const predict = (w: number, b: number, x: number) => w * x + b;

export interface ResidualRow {
  x: number;
  y: number;
  yHat: number;
  /** y − ŷ: positive when the point is above the line. */
  r: number;
  r2: number;
}

export function residuals(points: readonly { x: number; y: number }[], w: number, b: number): ResidualRow[] {
  return points.map(({ x, y }) => {
    const yHat = predict(w, b, x);
    const r = y - yHat;
    return { x, y, yHat, r, r2: r ** 2 };
  });
}

/** Mean squared error, summed left to right as the lesson's Python loop does. */
export function mse(points: readonly { x: number; y: number }[], w: number, b: number): number {
  if (points.length === 0) throw new Error('MSE of no points is undefined');
  let total = 0;
  for (const row of residuals(points, w, b)) total = total + row.r2;
  return total / points.length;
}

export interface LineFit {
  slope: number;
  intercept: number;
}

/**
 * The least-squares line: slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)², intercept = ȳ − slope·x̄.
 * These are the normal equations solved for one feature.
 */
export function leastSquares(points: readonly { x: number; y: number }[]): LineFit {
  const n = points.length;
  if (n < 2) throw new Error('A line needs at least two points');
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
  }
  if (sxx === 0) throw new Error('All x values are equal, so the slope is undefined');
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

export interface GDPoint {
  step: number;
  /** Slope and intercept in the original units (intercept at x = 0, even when x was centered). */
  slope: number;
  intercept: number;
  mse: number;
  /** The gradients used by the update that produced this point (absent at step 0). */
  grad?: { w: number; b: number };
}

export interface LinearGDRun {
  /** Step 0 is the start; one entry per completed update after that. */
  path: GDPoint[];
  status: 'ok' | 'diverged';
  /** The update (1-based) after which the values left the safe range. */
  divergedAt?: number;
  /** The amount subtracted from x before training (0 for raw x, x̄ for centered x). */
  shift: number;
}

/**
 * Batch gradient descent on MSE for ŷ = w·(x − shift) + c, starting from w = c = 0. Mirrors the
 * lesson's NumPy loop: err = ŷ − y, grad_w = 2·mean(err·xs), grad_c = 2·mean(err).
 * The reported intercept is c − w·shift, the line's value at x = 0.
 */
export function linearGD(
  points: readonly { x: number; y: number }[],
  opts: { lr: number; steps: number; center: boolean },
): LinearGDRun {
  const n = points.length;
  const shift = opts.center ? points.reduce((s, p) => s + p.x, 0) / n : 0;
  const xs = points.map((p) => p.x - shift);
  let w = 0;
  let c = 0;
  const lossAt = (w: number, c: number) => xs.reduce((s, x, i) => s + (w * x + c - points[i]!.y) ** 2, 0) / n;
  const path: GDPoint[] = [{ step: 0, slope: 0, intercept: 0, mse: lossAt(0, 0) }];
  for (let k = 1; k <= opts.steps; k++) {
    let gw = 0;
    let gc = 0;
    xs.forEach((x, i) => {
      const err = w * x + c - points[i]!.y;
      gw += err * x;
      gc += err;
    });
    const grad = { w: (2 * gw) / n, b: (2 * gc) / n };
    w = w - opts.lr * grad.w;
    c = c - opts.lr * grad.b;
    const point = { step: k, slope: w, intercept: c - w * shift, mse: lossAt(w, c), grad };
    if ([point.slope, point.intercept, point.mse].some((v) => isFiniteOrDiverged(v) === 'diverged'))
      return { path, status: 'diverged', divergedAt: k, shift };
    path.push(point);
  }
  return { path, status: 'ok', shift };
}
