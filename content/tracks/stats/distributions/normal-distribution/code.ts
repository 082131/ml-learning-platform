// Code for "The normal distribution, density and z-scores". The NormalDist program is linked to the explorer (μ, σ, a
// and b come from the sliders); src/lib/stats/dist.ts computes the same areas, checked against SciPy 1.18.1 in
// stats.test.ts. The runnable example was run with CPython 3.13 and NumPy 2.5.3 and its output copied.
import { lineOf, span } from '@/lib/foundations/annotate';
import { normalExperiment, type NormalState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const normal = normalExperiment('stats-normal');

const AREA = `from statistics import NormalDist

orders = NormalDist(mu={{mu}}, sigma={{sigma}})
a, b = {{a}}, {{b}}

z_a = (a - orders.mean) / orders.stdev
z_b = (b - orders.mean) / orders.stdev
area = orders.cdf(b) - orders.cdf(a)
print(f"z from {z_a:.2f} to {z_b:.2f}, P(a < X < b) = {area:.4f}")`;

const st = (s: unknown) => s as NormalState;

export const areaCode: CodeExample = {
  id: 'stats-normal-area',
  language: 'python',
  source: AREA,
  slots: {
    mu: (s) => String(st(s).mu),
    sigma: (s) => String(st(s).sigma),
    a: (s) => String(Math.min(st(s).a, st(s).b)),
    b: (s) => String(Math.max(st(s).a, st(s).b)),
  },
  annotations: [
    {
      id: 'dist',
      ...span(AREA, 3, 'NormalDist(mu={{mu}}, sigma={{sigma}})'),
      kind: 'function',
      title: 'Two numbers describe the whole curve',
      what: 'A normal distribution with mean μ (where the peak is) and standard deviation σ (how wide it is).',
      why: 'Every normal curve has the same shape; μ slides it and σ stretches it. That is why z-scores work.',
      inputs: 'μ and σ from the sliders',
    },
    {
      id: 'z',
      ...span(AREA, 5, '(a - orders.mean) / orders.stdev'),
      kind: 'math',
      title: 'z-score',
      what: 'How many standard deviations a lies from the mean (negative means below).',
      why: 'It puts any normal value on one common scale, so "z = 2" means the same rarity for orders, heights or test scores.',
    },
    {
      id: 'cdf',
      ...span(AREA, 7, 'orders.cdf(b) - orders.cdf(a)'),
      kind: 'math',
      title: 'Area between two points',
      what: 'cdf(x) is the area to the left of x. The area to the left of b minus the area to the left of a leaves the area between them.',
      why: 'For a continuous value, only areas are probabilities. This is the shaded region in the chart.',
      output: 'P(a < X < b)',
    },
  ],
};

const RULES = `from statistics import NormalDist
import numpy as np

orders = NormalDist(mu=500, sigma=40)
for k in (1, 2, 3):
    inside = orders.cdf(500 + k * 40) - orders.cdf(500 - k * 40)
    print(f"within {k} SD (from {500 - k * 40} to {500 + k * 40}): {inside:.4f}")

print(f"P(more than 600 orders) = {1 - orders.cdf(600):.4f}")
print(f"the busiest 5% of days have more than {orders.inv_cdf(0.95):.1f} orders")

rng = np.random.default_rng(1)
days = rng.normal(loc=500, scale=40, size=200_000)
z = (days - 500) / 40
print(f"simulated: share within 2 SD = {np.mean(np.abs(z) < 2):.4f}, share above 600 = {np.mean(days > 600):.4f}")`;

export const rulesRunner: CodeExample = {
  id: 'stats-normal-rules',
  language: 'python',
  run: 'pyodide',
  source: RULES,
  annotations: [
    {
      id: 'tail',
      ...span(RULES, lineOf(RULES, '1 - orders.cdf(600)'), '1 - orders.cdf(600)'),
      kind: 'math',
      title: 'A right tail',
      what: 'The area to the right of 600: everything minus the area to the left.',
      why: '600 is z = 2.5 standard deviations above the mean, so it is rare: about 6 days in 1,000.',
    },
    {
      id: 'inv',
      ...span(RULES, lineOf(RULES, 'inv_cdf'), 'orders.inv_cdf(0.95)'),
      kind: 'function',
      title: 'The inverse question',
      what: 'The value with 95% of the area to its left (the 95th percentile).',
      why: 'cdf goes from a value to a probability; inv_cdf goes from a probability back to a value. Capacity planning asks this direction: "how many orders must we handle on a bad day?"',
    },
  ],
  expectedOutput: `within 1 SD (from 460 to 540): 0.6827
within 2 SD (from 420 to 580): 0.9545
within 3 SD (from 380 to 620): 0.9973
P(more than 600 orders) = 0.0062
the busiest 5% of days have more than 565.8 orders
simulated: share within 2 SD = 0.9544, share above 600 = 0.0062`,
};
