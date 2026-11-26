// Code for "Confidence intervals". The coverage program is linked to the explorer (population, n, confidence and
// interval type from the controls); src/lib/stats/sim.ts runs the same seeded experiment for the chart and readout,
// and src/lib/stats/dist.ts gives the t critical values (checked against SciPy 1.18.1). The runnable example was run
// with CPython 3.13 and NumPy 2.5.3 and its output copied; python-outputs.test.ts re-runs it.
import { lineOf, span } from '@/lib/foundations/annotate';
import { ciExperiment, type CiState } from '@/lib/stats/experiments';
import { criticalValue, getPopulation } from '@/lib/stats/sim';
import type { CodeExample } from '@/lib/types';
import { DRAWS } from '../../sampling/sampling-distributions/code';

export const ci = ciExperiment('stats-ci');

const COVER = `import math
import random
import statistics

draw = {{draw}}
mu, sigma, n = {{mu}}, {{sigma}}, {{n}}
crit = {{crit}}          # {{critNote}}

hits = 0
for _ in range(1000):
    sample = [draw() for _ in range(n)]
    m = statistics.fmean(sample)
    half = crit * {{sd}} / math.sqrt(n)            # margin of error
    hits += m - half <= mu <= m + half             # did this interval catch mu?
print(f"{hits / 1000:.1%} of the intervals contain mu = {mu}")`;

const st = (s: unknown) => s as CiState;

export const coverCode: CodeExample = {
  id: 'stats-ci-coverage',
  language: 'python',
  source: COVER,
  slots: {
    draw: (s) => DRAWS[st(s).pop] ?? DRAWS.heights!,
    mu: (s) => String(getPopulation(st(s).pop).mean),
    sigma: (s) => String(Number(getPopulation(st(s).pop).sd.toFixed(3))),
    n: (s) => String(st(s).n),
    crit: (s) => criticalValue(st(s).method, st(s).confidence, st(s).n).toFixed(3),
    critNote: (s) =>
      st(s).method === 't'
        ? `t, ${st(s).n - 1} degrees of freedom, ${Math.round(st(s).confidence * 100)}%`
        : `z (normal), ${Math.round(st(s).confidence * 100)}%`,
    sd: (s) => (st(s).method === 'z-known' ? 'sigma' : 'statistics.stdev(sample)'),
  },
  annotations: [
    {
      id: 'crit',
      ...span(COVER, 7, 'crit = {{crit}}'),
      kind: 'variable',
      title: 'The critical value',
      what: 'How many standard errors the interval reaches on each side: 1.96 for a 95% z interval, more for a t interval with few data.',
      why: 'It comes from the curve that describes (estimate − truth) / SE: the normal curve if σ is known, the t curve if σ is estimated.',
      inputs: 'confidence level, interval type and n from the controls',
    },
    {
      id: 'half',
      ...span(COVER, 13, 'crit * {{sd}} / math.sqrt(n)'),
      kind: 'math',
      title: 'Margin of error',
      what: 'Critical value × standard error: the half-width of the interval.',
      why: 'The SE measures how far a sample mean typically strays from μ; the critical value scales that to the chosen confidence.',
    },
    {
      id: 'hit',
      ...span(COVER, 14, 'm - half <= mu <= m + half'),
      kind: 'math',
      title: 'Did it work this time?',
      what: 'True when this sample’s interval contains the true mean.',
      why: '"95% confidence" is a promise about this line: across many samples it should be True 95% of the time.',
    },
  ],
};

const RUN = `import math
import statistics
import numpy as np

order_values = [23.5, 41.0, 18.2, 77.9, 35.4, 29.9, 52.3, 19.8, 64.1, 38.7, 27.5, 45.0]   # dollars
n = len(order_values)
mean = statistics.fmean(order_values)
s = statistics.stdev(order_values)          # sample SD, divides by n - 1
se = s / math.sqrt(n)
t_crit = 2.201                              # t for 95% with n - 1 = 11 degrees of freedom: scipy.stats.t.ppf(0.975, 11)
z_crit = 1.960                              # NormalDist().inv_cdf(0.975)
print(f"mean {mean:.2f}, s {s:.2f}, SE {se:.2f}")
print(f"95% t interval: {mean - t_crit * se:.2f} to {mean + t_crit * se:.2f}")
print(f"95% z interval: {mean - z_crit * se:.2f} to {mean + z_crit * se:.2f}   (too narrow for n = 12)")

rng = np.random.default_rng(0)
boot = [rng.choice(order_values, n).mean() for _ in range(10_000)]
lo, hi = np.percentile(boot, [2.5, 97.5])
print(f"95% bootstrap interval: {lo:.2f} to {hi:.2f}")`;

export const intervalRunner: CodeExample = {
  id: 'stats-ci-orders',
  language: 'python',
  run: 'pyodide',
  source: RUN,
  annotations: [
    {
      id: 't',
      ...span(RUN, lineOf(RUN, 't_crit ='), 't_crit = 2.201'),
      kind: 'variable',
      title: 'A t critical value',
      what: 'The value with 97.5% of the t distribution (11 degrees of freedom) below it.',
      why: 'The standard library has no t distribution, so the value is written in from SciPy. In Pyodide or your own Python you can import scipy.stats instead.',
    },
    {
      id: 'boot',
      ...span(RUN, lineOf(RUN, 'rng.choice(order_values, n)'), 'rng.choice(order_values, n).mean()'),
      kind: 'function',
      title: 'A bootstrap resample',
      what: 'Draws 12 values from the sample, with replacement, and averages them.',
      why: 'Resampling the sample imitates resampling the population. The middle 95% of 10,000 such means is another interval for μ, with no formula. For tiny samples it is too narrow too.',
    },
  ],
  expectedOutput: `mean 39.44, s 18.16, SE 5.24
95% t interval: 27.90 to 50.98
95% z interval: 29.17 to 49.72   (too narrow for n = 12)
95% bootstrap interval: 30.14 to 49.75`,
};
