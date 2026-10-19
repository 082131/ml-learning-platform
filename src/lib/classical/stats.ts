/** Descriptive statistics, matching NumPy and pandas defaults where noted. */

const need = (xs: readonly number[], what: string) => {
  if (xs.length === 0) throw new Error(`${what} of an empty list is undefined`);
};

export function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function mean(xs: readonly number[]): number {
  need(xs, 'The mean');
  return sum(xs) / xs.length;
}

/**
 * Variance with `ddof` delta degrees of freedom: divide by n − ddof. NumPy's `np.var` uses ddof = 0;
 * pandas' `Series.var` and `.std` use ddof = 1.
 */
export function variance(xs: readonly number[], ddof = 0): number {
  need(xs, 'The variance');
  if (xs.length - ddof <= 0) throw new Error(`Variance needs more than ${ddof} values`);
  const m = mean(xs);
  return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - ddof);
}

export function std(xs: readonly number[], ddof = 0): number {
  return Math.sqrt(variance(xs, ddof));
}

/**
 * The q-quantile (0 ≤ q ≤ 1) with linear interpolation between the closest ranks: the default of
 * `np.quantile`, `np.percentile` and pandas' `Series.quantile`.
 */
export function quantile(xs: readonly number[], q: number): number {
  need(xs, 'A quantile');
  if (q < 0 || q > 1) throw new Error('q must be between 0 and 1');
  const sorted = [...xs].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

export function median(xs: readonly number[]): number {
  return quantile(xs, 0.5);
}

/** Pearson correlation coefficient r, from −1 to 1. NaN when either list is constant. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length) throw new Error('pearson needs two lists of the same length');
  need(xs, 'A correlation');
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  xs.forEach((x, i) => {
    const dx = x - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  });
  return sxy / Math.sqrt(sxx * syy);
}
