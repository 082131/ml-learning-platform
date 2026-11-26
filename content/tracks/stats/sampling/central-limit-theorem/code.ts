// Code for "The central limit theorem". The check program is linked to the explorer (population and n from the
// controls); src/lib/stats/sim.ts runs the same seeded experiment for the chart and readout. The runnable example was
// run with CPython 3.13 and NumPy 2.5.3 and its output copied; python-outputs.test.ts re-runs it.
import { lineOf, span } from '@/lib/foundations/annotate';
import { samplingExperiment, type SamplingState } from '@/lib/stats/experiments';
import { getPopulation } from '@/lib/stats/sim';
import type { CodeExample } from '@/lib/types';
import { DRAWS } from '../sampling-distributions/code';

export const clt = samplingExperiment('stats-clt', { pop: 'waits', n: 2, seed: 1 });

const CHECK = `import random
import statistics
from statistics import NormalDist

draw = {{draw}}
n = {{n}}
mu, sigma = {{mu}}, {{sigma}}       # the population's true mean and SD

means = [statistics.fmean(draw() for _ in range(n)) for _ in range(1000)]
clt = NormalDist(mu, sigma / n ** 0.5)          # the curve the theorem predicts
low = sum(m < clt.inv_cdf(0.025) for m in means) / len(means)
high = sum(m > clt.inv_cdf(0.975) for m in means) / len(means)
print(f"below the 2.5% point: {low:.1%}, above the 97.5% point: {high:.1%}")`;

const pop = (s: unknown) => getPopulation((s as SamplingState).pop);

export const checkCode: CodeExample = {
  id: 'stats-clt-check',
  language: 'python',
  source: CHECK,
  slots: {
    draw: (s) => DRAWS[(s as SamplingState).pop] ?? DRAWS.heights!,
    n: (s) => String((s as SamplingState).n),
    mu: (s) => String(pop(s).mean),
    sigma: (s) => String(Number(pop(s).sd.toFixed(3))),
  },
  annotations: [
    {
      id: 'curve',
      ...span(CHECK, 10, 'NormalDist(mu, sigma / n ** 0.5)'),
      kind: 'math',
      title: 'The prediction',
      what: 'A normal curve with the population’s mean and the standard error as its SD.',
      why: 'The central limit theorem says the sample means follow this curve, approximately, for any population with a finite SD.',
    },
    {
      id: 'tails',
      ...span(CHECK, 11, 'clt.inv_cdf(0.025)'),
      kind: 'function',
      title: 'Check the tails',
      what: 'The value with 2.5% of the predicted curve below it.',
      why: 'If the means really follow the curve, 2.5% of them fall below this point and 2.5% above the 97.5% point. Skewed data put too many in one tail until n is large.',
    },
  ],
};

const RUN = `import numpy as np

rng = np.random.default_rng(8)
mu = sigma = 20                              # exponential wait times: mean 20, SD 20, strongly skewed
print("    n  skewness  below -1.96 SE  above +1.96 SE   (normal curve: 0, 2.5%, 2.5%)")
for n in (1, 5, 30, 200):
    means = rng.exponential(scale=20, size=(20_000, n)).mean(axis=1)
    z = (means - mu) / (sigma / np.sqrt(n))  # standardise with the CLT's mean and SE
    skew = np.mean((z - z.mean()) ** 3) / z.std() ** 3
    print(f"{n:>5}  {skew:8.2f}  {np.mean(z < -1.96):14.1%}  {np.mean(z > 1.96):14.1%}")`;

export const cltRunner: CodeExample = {
  id: 'stats-clt-tails',
  language: 'python',
  run: 'pyodide',
  source: RUN,
  annotations: [
    {
      id: 'z',
      ...span(RUN, lineOf(RUN, 'z = (means'), '(means - mu) / (sigma / np.sqrt(n))'),
      kind: 'math',
      title: 'Standardise the means',
      what: 'Each sample mean as a z-score: distance from μ in standard errors.',
      why: 'If the CLT holds, z follows the standard normal, so 2.5% should land beyond each of ±1.96.',
    },
    {
      id: 'skew',
      ...span(RUN, lineOf(RUN, 'skew ='), 'np.mean((z - z.mean()) ** 3) / z.std() ** 3'),
      kind: 'math',
      title: 'Skewness',
      what: 'The average cubed z-score: 0 for a symmetric shape, positive for a long right tail.',
      why: 'For exponential data the skewness of the mean is 2 / √n: it shrinks, but slowly.',
    },
  ],
  expectedOutput: `    n  skewness  below -1.96 SE  above +1.96 SE   (normal curve: 0, 2.5%, 2.5%)
    1      1.90            0.0%            5.1%
    5      0.86            0.1%            4.3%
   30      0.33            1.6%            3.3%
  200      0.14            2.1%            3.0%`,
};
