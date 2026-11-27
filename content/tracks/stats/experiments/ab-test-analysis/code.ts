// Code for "Analysing an A/B test". The analysis program is linked to the first explorer (visitors and conversions
// from the inputs) and src/lib/stats/experiments.ts (abResult) computes the same numbers; the peeking explorer runs
// seeded A/A tests in src/lib/stats/sim.ts. The runnable examples were run with CPython 3.13 and NumPy 2.5.3 and their
// output copied; python-outputs.test.ts re-runs them.
import { lineOf, span } from '@/lib/foundations/annotate';
import { abExperiment, peekExperiment, type AbState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const ab = abExperiment('stats-ab');
export const peek = peekExperiment('stats-peek');

const ANALYSE = `import math
from statistics import NormalDist

conv_a, n_a, conv_b, n_b = {{convA}}, {{nA}}, {{convB}}, {{nB}}
pa, pb = conv_a / n_a, conv_b / n_b
diff = pb - pa

se = math.sqrt(pa * (1 - pa) / n_a + pb * (1 - pb) / n_b)            # for the interval
zc = NormalDist().inv_cdf(1 - (1 - {{conf}}) / 2)
print(f"B - A = {diff:.4f}, interval {diff - zc * se:.4f} to {diff + zc * se:.4f}")

pooled = (conv_a + conv_b) / (n_a + n_b)
se0 = math.sqrt(pooled * (1 - pooled) * (1 / n_a + 1 / n_b))         # for the test: assumes no difference
z = diff / se0
print(f"z = {z:.2f}, p = {2 * (1 - NormalDist().cdf(abs(z))):.4f}")`;

const st = (s: unknown) => s as AbState;

export const analyseCode: CodeExample = {
  id: 'stats-ab-analyse',
  language: 'python',
  source: ANALYSE,
  slots: {
    convA: (s) => String(st(s).convA),
    nA: (s) => String(st(s).nA),
    convB: (s) => String(st(s).convB),
    nB: (s) => String(st(s).nB),
    conf: (s) => String(st(s).confidence),
  },
  annotations: [
    {
      id: 'diff',
      ...span(ANALYSE, 6, 'pb - pa'),
      kind: 'math',
      title: 'The effect estimate',
      what: 'The difference in conversion rates, in absolute terms (percentage points when multiplied by 100).',
      why: 'This is the number the decision is about. Dividing by pa gives the relative lift, which is how lifts are usually quoted.',
    },
    {
      id: 'se',
      ...span(ANALYSE, 8, 'math.sqrt(pa * (1 - pa) / n_a + pb * (1 - pb) / n_b)'),
      kind: 'math',
      title: 'SE of the difference',
      what: 'Each group’s variance p(1 − p)/n, added, then square-rooted.',
      why: 'The groups are independent, so their variances add (the random variables lesson). Each group uses its own rate because the interval should not assume anything about the difference.',
    },
    {
      id: 'pooled',
      ...span(ANALYSE, 12, '(conv_a + conv_b) / (n_a + n_b)'),
      kind: 'math',
      title: 'The pooled rate',
      what: 'One conversion rate for everybody, as if A and B were the same.',
      why: 'The test computes how surprising the data are IF there is no difference. Under that assumption both groups share one rate, and pooling estimates it best.',
    },
    {
      id: 'z',
      ...span(ANALYSE, 14, 'diff / se0'),
      kind: 'math',
      title: 'How many SEs from zero',
      what: 'The observed difference divided by its standard error under the null.',
      why: 'The CLT makes this approximately standard normal when there is no difference, so the normal tail gives the p-value.',
    },
  ],
};

const RUN = `import math
from statistics import NormalDist

Z = NormalDist()

def analyse(conv_a, n_a, conv_b, n_b, confidence=0.95):
    pa, pb = conv_a / n_a, conv_b / n_b
    diff = pb - pa
    se = math.sqrt(pa * (1 - pa) / n_a + pb * (1 - pb) / n_b)      # for the interval
    zc = Z.inv_cdf(1 - (1 - confidence) / 2)
    pooled = (conv_a + conv_b) / (n_a + n_b)
    se0 = math.sqrt(pooled * (1 - pooled) * (1 / n_a + 1 / n_b))   # for the test: assumes no difference
    z = diff / se0
    return diff, diff - zc * se, diff + zc * se, z, 2 * (1 - Z.cdf(abs(z)))

for label, data in [("one week", (500, 10_000, 560, 10_000)), ("two weeks", (1000, 20_000, 1120, 20_000))]:
    diff, lo, hi, z, p = analyse(*data)
    print(f"{label:>9}: B - A = {diff * 100:+.2f} points, 95% CI {lo * 100:+.2f} to {hi * 100:+.2f}, z = {z:.2f}, p = {p:.4f}")`;

export const analyseRunner: CodeExample = {
  id: 'stats-ab-two-weeks',
  language: 'python',
  run: 'pyodide',
  source: RUN,
  annotations: [
    {
      id: 'data',
      ...span(RUN, lineOf(RUN, 'for label, data'), '("two weeks", (1000, 20_000, 1120, 20_000))'),
      kind: 'variable',
      title: 'Same rates, twice the data',
      what: 'Both weeks have 5.0% vs 5.6%. The second row doubles the visitors.',
      why: 'The estimate does not move; the interval narrows by √2 and stops including 0. More data changes the certainty, not the effect.',
    },
  ],
  expectedOutput: ` one week: B - A = +0.60 points, 95% CI -0.02 to +1.22, z = 1.89, p = 0.0583
two weeks: B - A = +0.60 points, 95% CI +0.16 to +1.04, z = 2.68, p = 0.0074`,
};

const PEEK = `import math
import numpy as np

rng = np.random.default_rng(1)
experiments, days, per_day, rate = 2000, 20, 500, 0.10     # A/A tests: both groups convert at 10%
a = rng.binomial(per_day, rate, size=(experiments, days)).cumsum(axis=1)   # conversions so far, by day
b = rng.binomial(per_day, rate, size=(experiments, days)).cumsum(axis=1)
n = per_day * np.arange(1, days + 1)                         # visitors so far in each group
pooled = (a + b) / (2 * n)
z = (b - a) / n / np.sqrt(pooled * (1 - pooled) * 2 / n)
p = np.vectorize(math.erfc)(np.abs(z) / math.sqrt(2))      # two-sided p-value after each day

print(f"look once, on day {days}: {np.mean(p[:, -1] < 0.05):.1%} of A/A tests 'significant'")
print(f"peek every day, stop at the first p < 0.05: {np.mean((p < 0.05).any(axis=1)):.1%}")`;

export const peekRunner: CodeExample = {
  id: 'stats-ab-peeking',
  language: 'python',
  run: 'pyodide',
  source: PEEK,
  annotations: [
    {
      id: 'cumsum',
      ...span(PEEK, lineOf(PEEK, 'cumsum(axis=1)'), '.cumsum(axis=1)'),
      kind: 'function',
      title: 'Data so far, each day',
      what: 'Running totals of conversions: column d holds everything collected up to day d.',
      why: 'A peek on day d looks at exactly this: all the data so far.',
    },
    {
      id: 'any',
      ...span(PEEK, lineOf(PEEK, '.any(axis=1)'), '(p < 0.05).any(axis=1)'),
      kind: 'function',
      title: 'Significant on ANY day',
      what: 'True for an experiment if its p-value dipped below 0.05 on at least one of the 20 days.',
      why: 'That is what "stop as soon as it is significant" really tests. Twenty chances to cross the line give about 24% false positives instead of 5%.',
    },
  ],
  expectedOutput: `look once, on day 20: 4.5% of A/A tests 'significant'
peek every day, stop at the first p < 0.05: 23.8%`,
};
