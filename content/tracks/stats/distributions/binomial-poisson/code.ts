// Code for "Bernoulli, binomial and Poisson". The formula program is linked to the explorer (its n, p, λ and k come
// from the sliders); src/lib/stats/dist.ts computes the same values, checked against SciPy 1.18.1 in stats.test.ts.
// The simulation was run with CPython 3.13 and NumPy 2.5.3 and its output copied; python-outputs.test.ts re-runs it.
import { lineOf, span } from '@/lib/foundations/annotate';
import { discreteExperiment, type DiscreteState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const discrete = discreteExperiment('stats-discrete');

const FORMULA = `import math

def binom_pmf(k, n, p):
    return math.comb(n, k) * p**k * (1 - p) ** (n - k)

def poisson_pmf(k, lam):
    return lam**k * math.exp(-lam) / math.factorial(k)

n, p, lam, k = {{n}}, {{p}}, {{lam}}, {{k}}
dist = {{pmf}}
at_most = sum(dist(i) for i in range(k + 1))
print(f"P(X = {k}) = {dist(k):.4f}, P(X <= {k}) = {at_most:.4f}, P(X > {k}) = {1 - at_most:.4f}")`;

const st = (s: unknown) => s as DiscreteState;

export const formulaCode: CodeExample = {
  id: 'stats-count-formulas',
  language: 'python',
  source: FORMULA,
  slots: {
    n: (s) => String(st(s).n),
    p: (s) => st(s).p.toFixed(2),
    lam: (s) => String(st(s).lambda),
    k: (s) => String(st(s).k),
    pmf: (s) => (st(s).family === 'binomial' ? 'lambda i: binom_pmf(i, n, p)' : 'lambda i: poisson_pmf(i, lam)'),
  },
  annotations: [
    {
      id: 'comb',
      ...span(FORMULA, 4, 'math.comb(n, k)'),
      kind: 'math',
      title: 'How many orders',
      what: 'The number of ways to choose which k of the n tries are the successes ("n choose k").',
      why: 'Every arrangement of k successes has the same probability, so we count the arrangements and multiply.',
    },
    {
      id: 'powers',
      ...span(FORMULA, 4, 'p**k * (1 - p) ** (n - k)'),
      kind: 'math',
      title: 'The chance of one arrangement',
      what: 'k successes at p each and n − k failures at 1 − p each, multiplied.',
      why: 'Multiplying is allowed because the tries are independent: the multiplication rule from the first lesson.',
    },
    {
      id: 'poisson',
      ...span(FORMULA, 7, 'lam**k * math.exp(-lam) / math.factorial(k)'),
      kind: 'math',
      title: 'The Poisson formula',
      what: 'λᵏ · e^(−λ) / k!: the chance of exactly k events when λ happen on average.',
      why: 'It is the binomial with a huge number of tiny chances (n → ∞, p = λ / n). e^(−λ) is the chance of no events at all.',
    },
    {
      id: 'cdf',
      ...span(FORMULA, 11, 'sum(dist(i) for i in range(k + 1))'),
      kind: 'math',
      title: 'At most k: add the bars',
      what: 'P(X = 0) + P(X = 1) + ... + P(X = k).',
      why: 'The outcomes 0, 1, ..., k are mutually exclusive, so their probabilities add. This running total is the CDF.',
      inputs: 'the threshold k above',
    },
  ],
};

const SIM = `import math
import numpy as np

def binom_pmf(k, n, p):
    return math.comb(n, k) * p**k * (1 - p) ** (n - k)

def poisson_pmf(k, lam):
    return lam**k * math.exp(-lam) / math.factorial(k)

rng = np.random.default_rng(3)
days = rng.binomial(n=20, p=0.1, size=100_000)       # buyers among 20 visitors, 100,000 days
print("buyers  formula  simulated")
for k in range(5):
    print(f"{k:>6}  {binom_pmf(k, 20, 0.1):.4f}   {np.mean(days == k):.4f}")

hours = rng.poisson(lam=3, size=100_000)               # tickets per hour
print(f"P(more than 6 tickets in an hour): formula {1 - sum(poisson_pmf(k, 3) for k in range(7)):.4f}, "
      f"simulated {np.mean(hours > 6):.4f}")
print(f"mean and variance of the hourly counts: {hours.mean():.3f}, {hours.var():.3f}")`;

export const simRunner: CodeExample = {
  id: 'stats-count-sim',
  language: 'python',
  run: 'pyodide',
  source: SIM,
  annotations: [
    {
      id: 'binomial',
      ...span(SIM, lineOf(SIM, 'rng.binomial'), 'rng.binomial(n=20, p=0.1, size=100_000)'),
      kind: 'function',
      title: '100,000 simulated days',
      what: 'Each number is how many of 20 visitors bought something on one day.',
      why: 'Comparing the share of days with k buyers to the formula checks that the formula describes the process.',
    },
    {
      id: 'meanvar',
      ...span(SIM, lineOf(SIM, 'hours.var()'), 'hours.mean():.3f}, {hours.var():.3f}'),
      kind: 'math',
      title: 'Mean ≈ variance',
      what: 'For Poisson counts the mean and the variance are both λ.',
      why: 'A quick check on real data: if the variance is far above the mean, the events are clumped and a Poisson model will underestimate the busy hours.',
    },
  ],
  expectedOutput: `buyers  formula  simulated
     0  0.1216   0.1235
     1  0.2702   0.2685
     2  0.2852   0.2846
     3  0.1901   0.1900
     4  0.0898   0.0903
P(more than 6 tickets in an hour): formula 0.0335, simulated 0.0340
mean and variance of the hourly counts: 3.016, 3.005`,
};
