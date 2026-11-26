// Code for "Samples, populations and the standard error". The resampling program is linked to the explorer (the
// population and n come from the controls); src/lib/stats/sim.ts runs the same experiment with a seeded generator for
// the chart and readout. Its exact numbers differ from Python's because the random generators differ; the SE they
// estimate is the same. The runnable example was run with CPython 3.13 and NumPy 2.5.3 and its output copied.
import { lineOf, span } from '@/lib/foundations/annotate';
import { samplingExperiment, type SamplingState } from '@/lib/stats/experiments';
import type { CodeExample } from '@/lib/types';

export const sampling = samplingExperiment('stats-sampling', { pop: 'waits', n: 10, seed: 1 });

export const DRAWS: Record<string, string> = {
  heights: 'lambda: random.gauss(170, 10)',
  waits: 'lambda: random.expovariate(1 / 20)',
  uniform: 'lambda: random.uniform(0, 100)',
  bimodal: 'lambda: random.gauss(random.choice([30, 70]), 5)',
  convert: 'lambda: 1 if random.random() < 0.1 else 0',
};

const RESAMPLE = `import random
import statistics

draw = {{draw}}       # one value from the population
n = {{n}}

means = []
for _ in range(1000):                              # 1,000 different samples
    sample = [draw() for _ in range(n)]
    means.append(statistics.fmean(sample))         # one statistic per sample

print("SD of the sample means:", round(statistics.pstdev(means), 3))`;

export const resampleCode: CodeExample = {
  id: 'stats-resample',
  language: 'python',
  source: RESAMPLE,
  slots: {
    draw: (s) => DRAWS[(s as SamplingState).pop] ?? DRAWS.heights!,
    n: (s) => String((s as SamplingState).n),
  },
  annotations: [
    {
      id: 'draw',
      ...span(RESAMPLE, 4, '{{draw}}'),
      kind: 'function',
      title: 'The population',
      what: 'A function that returns one random value from the population chosen above.',
      why: 'In real life you cannot call the population again and again: you get one sample. A simulation can, which is how we see what would happen across many samples.',
      inputs: 'the population chosen above',
    },
    {
      id: 'loop',
      ...span(RESAMPLE, 8, 'for _ in range(1000):'),
      kind: 'syntax',
      title: 'Many imaginary repeats',
      what: 'Takes 1,000 separate samples of size n.',
      why: 'The sampling distribution is defined by "what if we had taken a different sample?". Repeating the sampling 1,000 times makes that question concrete.',
    },
    {
      id: 'mean',
      ...span(RESAMPLE, 10, 'statistics.fmean(sample)'),
      kind: 'math',
      title: 'One statistic per sample',
      what: 'The mean of this one sample.',
      why: 'Each sample gives a slightly different mean. The list of 1,000 of them is the histogram on the right of the chart.',
    },
    {
      id: 'se',
      ...span(RESAMPLE, 12, 'statistics.pstdev(means)'),
      kind: 'math',
      title: 'The standard error, measured',
      what: 'How spread out the 1,000 means are.',
      why: 'This spread is the standard error. Compare it with σ / √n in the readout: the formula predicts it without any repeats.',
      output: 'about σ / √n',
    },
  ],
};

const SE = `import numpy as np

rng = np.random.default_rng(5)
sigma = 20                                   # wait times: exponential, mean 20 min, SD 20 min
for n in (4, 16, 64, 256):
    samples = rng.exponential(scale=20, size=(10_000, n))   # 10,000 samples of size n
    means = samples.mean(axis=1)
    print(f"n={n:>3}: SD of the 10,000 sample means = {means.std():5.2f}, sigma / sqrt(n) = {sigma / np.sqrt(n):5.2f}")

small = rng.exponential(scale=20, size=(100_000, 5))       # many samples of only 5 waits
print(f"average sample variance: dividing by n = {small.var(axis=1, ddof=0).mean():.0f}, "
      f"by n - 1 = {small.var(axis=1, ddof=1).mean():.0f}, true variance = {sigma ** 2}")`;

export const seRunner: CodeExample = {
  id: 'stats-se-sqrt-n',
  language: 'python',
  run: 'pyodide',
  source: SE,
  annotations: [
    {
      id: 'shape',
      ...span(SE, lineOf(SE, 'size=(10_000, n)'), 'size=(10_000, n)'),
      kind: 'parameter',
      title: 'Rows are samples',
      what: 'A 10,000 × n array: each row is one sample of n wait times.',
      why: 'mean(axis=1) then gives one mean per row, all at once.',
      output: 'shape (10000, n)',
    },
    {
      id: 'ddof',
      ...span(SE, lineOf(SE, 'ddof=1'), 'small.var(axis=1, ddof=1)'),
      kind: 'parameter',
      title: 'Why n − 1',
      what: 'The sample variance dividing by n − 1 instead of n (ddof = "delta degrees of freedom").',
      why: 'Dividing by n comes out too small on average (319 instead of 400 here). Dividing by n − 1 corrects that bias exactly.',
    },
  ],
  expectedOutput: `n=  4: SD of the 10,000 sample means = 10.00, sigma / sqrt(n) = 10.00
n= 16: SD of the 10,000 sample means =  5.03, sigma / sqrt(n) =  5.00
n= 64: SD of the 10,000 sample means =  2.53, sigma / sqrt(n) =  2.50
n=256: SD of the 10,000 sample means =  1.26, sigma / sqrt(n) =  1.25
average sample variance: dividing by n = 319, by n - 1 = 399, true variance = 400`,
};
