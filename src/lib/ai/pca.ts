import { dot, norm, scale, subtract } from '../math/vector';

const ITERATIONS = 200;
const NEGLIGIBLE = 1e-12;

/** The dominant eigenvector of XᵀX (X already centered), by power iteration from a fixed start. */
function topDirection(X: number[][]): number[] {
  const dims = X[0]!.length;
  // A fixed, uneven start vector keeps the result deterministic and unlikely to be orthogonal to the answer.
  let v = Array.from({ length: dims }, (_, d) => 1 + d / dims);
  for (let it = 0; it < ITERATIONS; it++) {
    const scores = X.map((row) => dot(row, v));
    const next = Array<number>(dims).fill(0);
    X.forEach((row, i) => row.forEach((x, d) => (next[d]! += x * scores[i]!)));
    const n = norm(next);
    if (n === 0) return v;
    v = scale(next, 1 / n);
  }
  // Fix the sign so the projection doesn't flip between runs: largest component positive.
  const big = v.reduce((best, x, d) => (Math.abs(x) > Math.abs(v[best]!) ? d : best), 0);
  return v[big]! < 0 ? scale(v, -1) : v;
}

export interface Projection {
  points: [number, number][];
  /** Share of the total variance that each of the two axes keeps, between 0 and 1. */
  explained: [number, number];
}

/**
 * Principal component analysis to 2-D: center the vectors, find the two directions of greatest
 * variance, and give each vector's coordinates along them.
 */
export function pca2d(vectors: number[][]): Projection {
  if (vectors.length < 2) throw new Error('PCA needs at least two vectors');
  const dims = vectors[0]!.length;
  const mean = Array<number>(dims).fill(0);
  vectors.forEach((v) => v.forEach((x, d) => (mean[d]! += x / vectors.length)));
  const X = vectors.map((v) => subtract(v, mean));
  const total = X.reduce((s, row) => s + dot(row, row), 0);
  const first = topDirection(X);
  const deflated = X.map((row) => subtract(row, scale(first, dot(row, first))));
  const rest = deflated.reduce((s, row) => s + dot(row, row), 0);
  // With (almost) no variance left, there is no meaningful second direction: use 0 for every point.
  const second = rest > NEGLIGIBLE * total ? topDirection(deflated) : Array<number>(dims).fill(0);
  const points = X.map((row) => [dot(row, first), dot(row, second)] as [number, number]);
  const variance = (axis: 0 | 1) => points.reduce((s, p) => s + p[axis] ** 2, 0) / (total || 1);
  return { points, explained: [variance(0), variance(1)] };
}
