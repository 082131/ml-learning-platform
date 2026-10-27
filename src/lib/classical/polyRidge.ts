import { normal, seededRandom } from './random';

/**
 * Ridge-regularized polynomial regression on one input, solved in closed form:
 *   (XᵀX + λP) w = Xᵀy
 * where X has the columns 1, t, t², …, t^d with t = 2x − 1 (x in [0, 1] mapped to [−1, 1], which keeps
 * the powers between −1 and 1), and P is the identity with P[0][0] = 0, so the intercept is not
 * penalized (as in scikit-learn's Ridge). The system is solved by Cholesky factorization, the method
 * NumPy's solve would also be stable with for this symmetric positive definite matrix.
 */

export interface Points {
  x: number[];
  y: number[];
}

export interface SineData {
  train: Points;
  validation: Points;
}

export const NOISE_SD = 0.3;
export const DATA_DECIMALS = 3;

const round = (v: number, d = DATA_DECIMALS) => Number(v.toFixed(d));

/** y = sin(2πx), the curve the noisy points come from. */
export const trueCurve = (x: number) => Math.sin(2 * Math.PI * x);

/**
 * `n` points with x uniform on [0, 1] (sorted) and y = sin(2πx) + Gaussian noise with standard
 * deviation `sd`, from `rand`. Values are rounded to 3 decimals so the Python code can show them exactly.
 */
export function sinePoints(rand: () => number, n: number, sd = NOISE_SD): Points {
  const x = Array.from({ length: n }, () => round(rand())).sort((a, b) => a - b);
  const y = x.map((v) => round(trueCurve(v) + sd * normal(rand)));
  return { x, y };
}

/** A training set and a validation set of `n` points each, from one seed. */
export function sineData(seed: number, n = 20): SineData {
  const rand = seededRandom(seed);
  return { train: sinePoints(rand, n), validation: sinePoints(rand, n) };
}

/** The design matrix: one row per x, columns t⁰ … t^degree with t = 2x − 1. */
export function design(x: readonly number[], degree: number): number[][] {
  return x.map((v) => {
    const t = 2 * v - 1;
    return Array.from({ length: degree + 1 }, (_, p) => t ** p);
  });
}

/** Solves A w = b for a symmetric positive definite A by Cholesky (A = L Lᵀ), then two triangular solves. */
export function choleskySolve(A: readonly number[][], b: readonly number[]): number[] {
  const n = b.length;
  const L = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i]![j]!;
      for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
      if (i === j) {
        if (s <= 0) throw new Error('Matrix is not positive definite');
        L[i]![i] = Math.sqrt(s);
      } else L[i]![j] = s / L[j]![j]!;
    }
  }
  const z = Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i]!;
    for (let k = 0; k < i; k++) s -= L[i]![k]! * z[k]!;
    z[i] = s / L[i]![i]!;
  }
  const w = Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = z[i]!;
    for (let k = i + 1; k < n; k++) s -= L[k]![i]! * w[k]!;
    w[i] = s / L[i]![i]!;
  }
  return w;
}

/** Ridge weights w for this degree and λ, intercept unpenalized: (XᵀX + λP) w = Xᵀy. */
export function fitRidge(data: Points, degree: number, lambda: number): number[] {
  const X = design(data.x, degree);
  const m = degree + 1;
  const A = Array.from({ length: m }, (_, i) =>
    Array.from({ length: m }, (_, j) => {
      let s = 0;
      for (const row of X) s += row[i]! * row[j]!;
      return s + (i === j && i > 0 ? lambda : 0);
    }),
  );
  const b = Array.from({ length: m }, (_, i) => X.reduce((s, row, r) => s + row[i]! * data.y[r]!, 0));
  return choleskySolve(A, b);
}

/** The polynomial at x: Σ w_p · (2x − 1)^p. */
export function predict(w: readonly number[], x: number): number {
  const t = 2 * x - 1;
  return w.reduce((s, wp, p) => s + wp * t ** p, 0);
}

/** Mean squared error of the polynomial on these points: (1/n) Σ (ŷᵢ − yᵢ)². */
export function mse(w: readonly number[], data: Points): number {
  return data.x.reduce((s, x, i) => s + (predict(w, x) - data.y[i]!) ** 2, 0) / data.x.length;
}

export interface FitScores {
  train: number;
  validation: number;
}

/** Fit on the training points and score on both sets. */
export function scoreFit(data: SineData, degree: number, lambda: number): FitScores & { w: number[] } {
  const w = fitRidge(data.train, degree, lambda);
  return { w, train: mse(w, data.train), validation: mse(w, data.validation) };
}

/** Index of the smallest value (the first one on ties). */
export const argmin = (xs: readonly number[]) => xs.reduce((best, v, i) => (v < xs[best]! ? i : best), 0);
