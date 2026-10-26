import { seededRandom } from '../classical/random';
import { formatNumber } from '../trace/values';
import type { ExperimentDef } from '../types';

/** A discrete distribution: outcomes and their probabilities (which sum to 1). */
export interface Discrete {
  id: string;
  label: string;
  values: number[];
  probs: number[];
}

function binomial(n: number, p: number): Discrete {
  const values = Array.from({ length: n + 1 }, (_, k) => k);
  const choose = (k: number) => values.slice(0, k).reduce((c, i) => (c * (n - i)) / (i + 1), 1);
  return {
    id: 'heads',
    label: `Heads in ${n} fair coin flips`,
    values,
    probs: values.map((k) => choose(k) * p ** k * (1 - p) ** (n - k)),
  };
}

export const DISTRIBUTIONS: Record<string, Discrete> = {
  die: { id: 'die', label: 'Fair die', values: [1, 2, 3, 4, 5, 6], probs: Array(6).fill(1 / 6) },
  loaded: {
    id: 'loaded',
    label: 'Loaded die (6 comes up half the time)',
    values: [1, 2, 3, 4, 5, 6],
    probs: [0.1, 0.1, 0.1, 0.1, 0.1, 0.5],
  },
  heads: binomial(10, 0.5),
};

/** E[X] = Σ x · P(X = x). */
export const expectedValue = (d: Discrete) => d.values.reduce((s, x, i) => s + x * d.probs[i]!, 0);

/** Draws by inverse CDF: the first outcome whose cumulative probability exceeds a uniform u in [0, 1). */
export function draw(d: Discrete, u: number): number {
  let cum = 0;
  for (let i = 0; i < d.values.length; i++) {
    cum += d.probs[i]!;
    if (u < cum) return d.values[i]!;
  }
  return d.values.at(-1)!; // u within rounding of 1
}

/** n draws from d with the seeded generator: the same seed always gives the same sample. */
export function sample(d: Discrete, n: number, seed: number): number[] {
  const rand = seededRandom(seed);
  return Array.from({ length: n }, () => draw(d, rand()));
}

export interface SampleSummary {
  counts: number[];
  freqs: number[];
  mean: number;
  expected: number;
  /** The largest |frequency − probability| over the outcomes. */
  maxGap: number;
}

export function summarize(d: Discrete, xs: readonly number[]): SampleSummary {
  const counts = d.values.map((v) => xs.filter((x) => x === v).length);
  const freqs = counts.map((c) => c / xs.length);
  return {
    counts,
    freqs,
    mean: xs.reduce((s, x) => s + x, 0) / xs.length,
    expected: expectedValue(d),
    maxGap: Math.max(...freqs.map((f, i) => Math.abs(f - d.probs[i]!))),
  };
}

export interface SamplingState {
  dist: string;
  /** log10 of the sample size, so one slider spans 10 to 10,000. */
  logN: number;
  seed: number;
}

export const sampleSize = (logN: number) => Math.round(10 ** logN);

/** The sampling simulator: pick a distribution, a sample size and a seed. */
export function samplingExperiment(
  id: string,
  initial: SamplingState,
): ExperimentDef<SamplingState, SampleSummary> {
  const distOf = (s: SamplingState) => DISTRIBUTIONS[s.dist] ?? DISTRIBUTIONS.die!;
  return {
    id,
    initial,
    controls: [
      {
        kind: 'select',
        id: 'dist',
        label: 'Distribution',
        options: Object.values(DISTRIBUTIONS).map((d) => ({ value: d.id, label: d.label })),
        get: (s) => s.dist,
        set: (s, dist) => ({ ...s, dist }),
      },
      {
        kind: 'slider',
        id: 'logN',
        label: 'Sample size n',
        min: 1,
        max: 4,
        step: 0.5,
        get: (s) => s.logN,
        set: (s, logN) => ({ ...s, logN }),
        format: (v) => sampleSize(v).toLocaleString('en-US'),
      },
      {
        kind: 'number',
        id: 'seed',
        label: 'Seed',
        min: 0,
        max: 9999,
        step: 1,
        get: (s) => s.seed,
        set: (s, seed) => ({ ...s, seed: Math.round(seed) }),
      },
    ],
    compute: (s) => summarize(distOf(s), sample(distOf(s), sampleSize(s.logN), s.seed)),
    readout: (s, r) => [
      { label: 'Expected value E[X]', value: formatNumber(r.expected) },
      {
        label: `Sample mean of ${sampleSize(s.logN).toLocaleString('en-US')} draws`,
        value: formatNumber(r.mean),
      },
      { label: 'Mean − E[X]', value: formatNumber(r.mean - r.expected) },
      { label: 'Largest |frequency − probability|', value: formatNumber(r.maxGap) },
    ],
  };
}

const st = (s: unknown) => s as SamplingState;
/** The NumPy call that draws the same distribution (with NumPy's own generator, so different numbers). */
export const NUMPY_DRAW: Record<string, string> = {
  die: 'rng.choice([1, 2, 3, 4, 5, 6], size=n)',
  loaded: 'rng.choice([1, 2, 3, 4, 5, 6], size=n, p=[0.1, 0.1, 0.1, 0.1, 0.1, 0.5])',
  heads: 'rng.binomial(10, 0.5, size=n)',
};

export const samplingSlots = {
  draw: (s: unknown) => NUMPY_DRAW[st(s).dist] ?? NUMPY_DRAW.die!,
  n: (s: unknown) => String(sampleSize(st(s).logN)),
  seed: (s: unknown) => String(st(s).seed),
};
