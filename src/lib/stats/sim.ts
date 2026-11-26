/**
 * Seeded simulations for the Statistics and probability track: populations to sample from, repeated samples, interval
 * coverage, A/A tests with peeking, and Beta draws. The same seed always gives the same result, so a lesson's numbers
 * can be checked and its tests are exact.
 */
import { normal, seededRandom } from '../classical/random';
import { normalCdf, normalPdf, tQuantile, normalQuantile } from './dist';

export interface Population {
  id: string;
  label: string;
  /** What one value means, for captions: "minutes waited". */
  unit: string;
  mean: number;
  sd: number;
  /** The range the histograms cover. */
  lo: number;
  hi: number;
  /** One draw. */
  draw: (rand: () => number) => number;
  /** The density, for the population curve (absent for the 0/1 population, drawn as two bars). */
  pdf?: (x: number) => number;
}

const BIMODAL_SD = 5;

export const POPULATIONS: Record<string, Population> = {
  heights: {
    id: 'heights',
    label: 'Heights: bell-shaped (mean 170 cm, SD 10)',
    unit: 'cm',
    mean: 170,
    sd: 10,
    lo: 130,
    hi: 210,
    draw: (r) => 170 + 10 * normal(r),
    pdf: (x) => normalPdf(x, 170, 10),
  },
  waits: {
    id: 'waits',
    label: 'Support wait times: skewed (mean 20 min)',
    unit: 'min',
    mean: 20,
    sd: 20,
    lo: 0,
    hi: 100,
    draw: (r) => -20 * Math.log(1 - r()),
    pdf: (x) => (x < 0 ? 0 : Math.exp(-x / 20) / 20),
  },
  uniform: {
    id: 'uniform',
    label: 'Uniform: every value from 0 to 100 equally likely',
    unit: '',
    mean: 50,
    sd: 100 / Math.sqrt(12),
    lo: 0,
    hi: 100,
    draw: (r) => 100 * r(),
    pdf: (x) => (x >= 0 && x <= 100 ? 0.01 : 0),
  },
  bimodal: {
    id: 'bimodal',
    label: 'Two humps: half near 30, half near 70',
    unit: '',
    mean: 50,
    sd: Math.sqrt(BIMODAL_SD ** 2 + 20 ** 2),
    lo: 0,
    hi: 100,
    draw: (r) => (r() < 0.5 ? 30 : 70) + BIMODAL_SD * normal(r),
    pdf: (x) => 0.5 * normalPdf(x, 30, BIMODAL_SD) + 0.5 * normalPdf(x, 70, BIMODAL_SD),
  },
  convert: {
    id: 'convert',
    label: 'Converted or not: 1 with probability 0.1, else 0',
    unit: '',
    mean: 0.1,
    sd: Math.sqrt(0.1 * 0.9),
    lo: 0,
    hi: 1,
    draw: (r) => (r() < 0.1 ? 1 : 0),
  },
};

export const getPopulation = (id: string) => POPULATIONS[id] ?? POPULATIONS.heights!;

export const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Sample standard deviation (divides by n − 1, like statistics.stdev and NumPy's ddof=1). */
export function sampleSd(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Population-style SD of a list (divides by n), used for the spread of many simulated means. */
export function spread(xs: readonly number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

/** Skewness: about 0 for symmetric shapes, positive when a long tail stretches to the right. */
export function skewness(xs: readonly number[]): number {
  const m = mean(xs);
  const sd = spread(xs);
  if (sd === 0) return 0;
  return xs.reduce((s, x) => s + ((x - m) / sd) ** 3, 0) / xs.length;
}

export interface Bin {
  lo: number;
  hi: number;
  count: number;
}

/** Counts per equal-width bin over [lo, hi]; values outside are clamped into the end bins. */
export function histogram(xs: readonly number[], lo: number, hi: number, bins: number): Bin[] {
  const w = (hi - lo) / bins;
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({ lo: lo + i * w, hi: lo + (i + 1) * w, count: 0 }));
  for (const x of xs) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / w)));
    out[i]!.count++;
  }
  return out;
}

/** `reps` samples of size n from the population; returns each sample's mean, and the first sample itself. */
export function sampleMeans(pop: Population, n: number, reps: number, seed: number): { means: number[]; first: number[] } {
  const rand = seededRandom(seed);
  let first: number[] = [];
  const means: number[] = [];
  for (let r = 0; r < reps; r++) {
    const xs = Array.from({ length: n }, () => pop.draw(rand));
    if (r === 0) first = xs;
    means.push(mean(xs));
  }
  return { means, first };
}

export type IntervalMethod = 'z-known' | 't' | 'z-with-s';

export interface Interval {
  mean: number;
  lo: number;
  hi: number;
  covers: boolean;
}

/** The critical value: how many standard errors on each side of the mean the interval reaches. */
export function criticalValue(method: IntervalMethod, confidence: number, n: number): number {
  const p = 1 - (1 - confidence) / 2;
  return method === 't' ? tQuantile(p, n - 1) : normalQuantile(p);
}

/** One confidence interval for the mean from a sample. 'z-known' uses the true σ; the others use the sample SD. */
export function meanInterval(xs: readonly number[], method: IntervalMethod, confidence: number, sigma: number): Omit<Interval, 'covers'> {
  const m = mean(xs);
  const sd = method === 'z-known' ? sigma : sampleSd(xs);
  const half = criticalValue(method, confidence, xs.length) * (sd / Math.sqrt(xs.length));
  return { mean: m, lo: m - half, hi: m + half };
}

/** `reps` intervals from fresh samples; how many contain the true mean. */
export function intervalCoverage(
  pop: Population,
  n: number,
  confidence: number,
  method: IntervalMethod,
  reps: number,
  seed: number,
): { intervals: Interval[]; covered: number } {
  const rand = seededRandom(seed);
  const intervals: Interval[] = [];
  for (let r = 0; r < reps; r++) {
    const xs = Array.from({ length: n }, () => pop.draw(rand));
    const iv = meanInterval(xs, method, confidence, pop.sd);
    intervals.push({ ...iv, covers: iv.lo <= pop.mean && pop.mean <= iv.hi });
  }
  return { intervals, covered: intervals.filter((i) => i.covers).length };
}

/** Two-sided p-value of a two-proportion z-test with the pooled standard error. 1 when there is no variation. */
export function twoProportionP(convA: number, nA: number, convB: number, nB: number): number {
  const pooled = (convA + convB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se === 0) return 1;
  const z = (convB / nB - convA / nA) / se;
  return 2 * (1 - normalCdf(Math.abs(z)));
}

/**
 * How many of n visitors convert at rate p: one Binomial(n, p) draw, by walking up the cumulative probabilities
 * (inverse transform, about n·p steps). Falls back to n coin flips when q^n would underflow.
 */
export function binomialDraw(n: number, p: number, rand: () => number): number {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  const q = 1 - p;
  let prob = q ** n;
  if (prob < 1e-300) {
    let k = 0;
    for (let i = 0; i < n; i++) if (rand() < p) k++;
    return k;
  }
  const u = rand();
  let cum = prob;
  let k = 0;
  while (u >= cum && k < n) {
    prob *= ((n - k) / (k + 1)) * (p / q);
    k++;
    cum += prob;
  }
  return k;
}

export interface PeekRun {
  /** The p-value after each day, on all data so far. */
  pValues: number[];
  /** First day (1-based) with p < alpha, or null. */
  firstSignificant: number | null;
}

/**
 * A/A tests: both arms convert at the same rate, so every "significant" result is a false positive. Each experiment
 * runs `days` days with `perDay` visitors per arm per day.
 */
export function simulateAATests(experiments: number, days: number, perDay: number, rate: number, alpha: number, seed: number): PeekRun[] {
  const rand = seededRandom(seed);
  const runs: PeekRun[] = [];
  for (let e = 0; e < experiments; e++) {
    let ca = 0;
    let cb = 0;
    const pValues: number[] = [];
    let firstSignificant: number | null = null;
    for (let d = 1; d <= days; d++) {
      ca += binomialDraw(perDay, rate, rand);
      cb += binomialDraw(perDay, rate, rand);
      const p = twoProportionP(ca, d * perDay, cb, d * perDay);
      pValues.push(p);
      if (firstSignificant === null && p < alpha) firstSignificant = d;
    }
    runs.push({ pValues, firstSignificant });
  }
  return runs;
}

/** A Gamma(shape, 1) draw (Marsaglia and Tsang), for Beta draws. */
export function gammaDraw(shape: number, rand: () => number): number {
  if (shape < 1) return gammaDraw(shape + 1, rand) * rand() ** (1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v ** 3;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** A Beta(a, b) draw: X / (X + Y) with X ~ Gamma(a), Y ~ Gamma(b). */
export function betaDraw(a: number, b: number, rand: () => number): number {
  const x = gammaDraw(a, rand);
  return x / (x + gammaDraw(b, rand));
}
