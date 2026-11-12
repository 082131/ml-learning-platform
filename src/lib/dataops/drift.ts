/**
 * The baselines-and-drift lesson's experiment: one numeric feature, a baseline of 1,000 training values and a
 * window of serving values whose mean is shifted. The two-sample Kolmogorov–Smirnov test and the population
 * stability index (PSI) are computed for real; the learner sees that a large window makes a tiny shift
 * "significant" while PSI stays small. drift.test.ts checks every setting against DRIFT_SOURCE run with CPython.
 *
 * The Python never calls sum() on floats: since Python 3.12, sum() uses compensated addition, which a plain
 * JavaScript loop would not reproduce bit for bit. Both sides add in a plain loop instead.
 */
import { LCG } from '../practice/lcg';
import { pyFixed } from '../practice/pyFormat';
import type { ExperimentDef } from '../types';

export const SHIFTS = [0, 0.02, 0.05, 0.1, 0.25] as const;
export const WINDOWS = [200, 2000, 20000] as const;
export const N_BASE = 1000;
const BINS = 10;
const SHARE_FLOOR = 1e-4;
const KS_TERMS = 100;
const SMALL_LAMBDA = 0.3;

export interface DriftState {
  shift: (typeof SHIFTS)[number];
  window: (typeof WINDOWS)[number];
}

/** A bell-shaped value from 4 uniforms (mean 2, standard deviation √(1/3) ≈ 0.577), as sample() in the Python. */
export function sample(rng: LCG): number {
  return rng.random() + rng.random() + rng.random() + rng.random();
}

export function ksStatistic(a: number[], b: number[]): number {
  const x = [...a].sort((p, q) => p - q);
  const y = [...b].sort((p, q) => p - q);
  let i = 0;
  let j = 0;
  let d = 0;
  while (i < x.length && j < y.length) {
    const v = Math.min(x[i]!, y[j]!);
    while (i < x.length && x[i] === v) i++;
    while (j < y.length && y[j] === v) j++;
    d = Math.max(d, Math.abs(i / x.length - j / y.length));
  }
  return d;
}

/** Asymptotic p-value of the two-sample KS test (the Kolmogorov distribution, Numerical Recipes' correction). */
export function ksPValue(d: number, n: number, m: number): number {
  const en = Math.sqrt((n * m) / (n + m));
  const lam = (en + 0.12 + 0.11 / en) * d;
  if (lam < SMALL_LAMBDA) return 1; // the series converges too slowly here, and Q(λ) is 1 to 5 decimals
  let q = 0;
  let sign = 1;
  for (let k = 1; k <= KS_TERMS; k++) {
    q += sign * 2 * Math.exp(-2 * k * k * lam * lam);
    sign = -sign;
  }
  return Math.min(1, Math.max(0, q));
}

export interface PsiBin {
  expected: number;
  actual: number;
}

/** PSI over 10 equal-count bins of the baseline. */
export function psi(base: number[], current: number[]): { value: number; bins: PsiBin[] } {
  const edges = [...base].sort((p, q) => p - q);
  const cuts = Array.from({ length: BINS - 1 }, (_, i) => edges[Math.floor((edges.length * (i + 1)) / BINS)]!);
  const shares = (values: number[]) => {
    const counts = new Array<number>(BINS).fill(0);
    for (const v of values) {
      let k = 0;
      for (const c of cuts) if (v >= c) k++;
      counts[k]!++;
    }
    return counts.map((c) => Math.max(c / values.length, SHARE_FLOOR));
  };
  const e = shares(base);
  const a = shares(current);
  let value = 0;
  for (let i = 0; i < BINS; i++) value += (a[i]! - e[i]!) * Math.log(a[i]! / e[i]!);
  return { value, bins: e.map((expected, i) => ({ expected, actual: a[i]! })) };
}

export interface DriftResult {
  baseMean: number;
  currentMean: number;
  d: number;
  p: number;
  psi: number;
  bins: PsiBin[];
}

let baseCache: number[] | undefined;
function baseline(): number[] {
  if (!baseCache) {
    const rng = new LCG(1);
    baseCache = Array.from({ length: N_BASE }, () => sample(rng));
  }
  return baseCache;
}

const mean = (xs: number[]) => {
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
};

export function drift({ shift, window }: DriftState): DriftResult {
  const base = baseline();
  const rng = new LCG(2);
  const current = Array.from({ length: window }, () => sample(rng) + shift);
  const d = ksStatistic(base, current);
  const p = psi(base, current);
  return {
    baseMean: mean(base),
    currentMean: mean(current),
    d,
    p: ksPValue(d, base.length, current.length),
    psi: p.value,
    bins: p.bins,
  };
}

export const psiBand = (v: number) => (v < 0.1 ? 'stable' : v < 0.25 ? 'investigate' : 'major shift');

function pFormat(p: number): string {
  return p < 0.0001 ? '< 0.0001' : `= ${pyFixed(p, 4)}`;
}

/** What DRIFT_SOURCE prints. */
export function driftPrintout(r: DriftResult, s: DriftState): string {
  return [
    `baseline mean ${pyFixed(r.baseMean, 3)}, window of ${s.window}: mean ${pyFixed(r.currentMean, 3)}`,
    `KS D = ${pyFixed(r.d, 4)}, p ${pFormat(r.p)} -> ${r.p < 0.05 ? 'drift alert' : 'no alert'}`,
    `PSI = ${pyFixed(r.psi, 3)} -> ${psiBand(r.psi)}`,
  ].join('\n');
}

export const DRIFT_SOURCE = `import math


class LCG:  # the same generator as the lesson's TypeScript
    def __init__(self, seed):
        self.state = seed % 2**32

    def random(self):
        self.state = (1664525 * self.state + 1013904223) % 2**32
        return self.state / 2**32


def sample(rng):  # bell-shaped: mean 2, standard deviation 0.577
    return rng.random() + rng.random() + rng.random() + rng.random()


SHIFT = {{shift}}  # how far the serving mean moved
WINDOW = {{window}}  # serving values compared with the baseline

rng = LCG(1)
base = [sample(rng) for _ in range(1000)]  # the training baseline
rng = LCG(2)
current = [sample(rng) + SHIFT for _ in range(WINDOW)]


def ks_statistic(a, b):  # the largest gap between the two empirical CDFs
    x, y, i, j, d = sorted(a), sorted(b), 0, 0, 0.0
    while i < len(x) and j < len(y):
        v = min(x[i], y[j])
        while i < len(x) and x[i] == v:
            i += 1
        while j < len(y) and y[j] == v:
            j += 1
        d = max(d, abs(i / len(x) - j / len(y)))
    return d


def ks_p_value(d, n, m):  # asymptotic Kolmogorov distribution
    en = math.sqrt(n * m / (n + m))
    lam = (en + 0.12 + 0.11 / en) * d
    if lam < 0.3:  # the series converges too slowly here, and the answer is 1 to 5 decimals
        return 1.0
    q, sign = 0.0, 1
    for k in range(1, 101):
        q += sign * 2 * math.exp(-2 * k * k * lam * lam)
        sign = -sign
    return min(1.0, max(0.0, q))


def psi(expected, actual, bins=10):
    edges = sorted(expected)
    cuts = [edges[len(edges) * i // bins] for i in range(1, bins)]  # equal-count bins of the baseline

    def shares(values):
        counts = [0] * bins
        for v in values:
            counts[sum(v >= c for c in cuts)] += 1
        return [max(c / len(values), 1e-4) for c in counts]

    e, a, total = shares(expected), shares(actual), 0.0
    for ei, ai in zip(e, a):
        total += (ai - ei) * math.log(ai / ei)
    return total


def mean(xs):
    total = 0.0
    for x in xs:
        total += x
    return total / len(xs)


d = ks_statistic(base, current)
p = ks_p_value(d, len(base), len(current))
score = psi(base, current)
print(f"baseline mean {mean(base):.3f}, window of {WINDOW}: mean {mean(current):.3f}")
print(f"KS D = {d:.4f}, p {'< 0.0001' if p < 0.0001 else f'= {p:.4f}'} -> {'drift alert' if p < 0.05 else 'no alert'}")
band = "stable" if score < 0.1 else "investigate" if score < 0.25 else "major shift"
print(f"PSI = {score:.3f} -> {band}")`;

export const driftSlots = (s: DriftState) => ({ shift: String(s.shift), window: String(s.window) });

export function driftExperiment(id: string): ExperimentDef<DriftState, DriftResult> {
  return {
    id,
    initial: { shift: 0.05, window: 200 },
    controls: [
      {
        kind: 'select',
        id: 'shift',
        label: 'Mean shift in serving data',
        options: SHIFTS.map((v) => ({ value: String(v), label: `+${v} (${pyFixed((v / 0.577) * 100, 0)}% of a std)` })),
        get: (s) => String(s.shift),
        set: (s, v) => ({ ...s, shift: Number(v) as DriftState['shift'] }),
      },
      {
        kind: 'select',
        id: 'window',
        label: 'Serving window',
        options: WINDOWS.map((v) => ({ value: String(v), label: `${v.toLocaleString('en-US')} values` })),
        get: (s) => String(s.window),
        set: (s, v) => ({ ...s, window: Number(v) as DriftState['window'] }),
      },
    ],
    compute: drift,
    readout: (s, r) => [
      { label: 'Python: what drift.py prints', value: driftPrintout(r, s) },
      {
        label: 'KS test',
        value: r.p < 0.05 ? 'alert (p < 0.05)' : 'no alert',
      },
      { label: 'PSI', value: `${pyFixed(r.psi, 3)}: ${psiBand(r.psi)}` },
    ],
  };
}
