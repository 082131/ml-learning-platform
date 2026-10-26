// Code for probability. Outputs and error messages were produced by running the code with NumPy 2.5.3 on
// CPython 3.13. The simulator in the lesson uses its own seeded generator (mulberry32, src/lib/classical/random),
// so its samples are not the numbers NumPy or Python's random module would draw.
import { samplingExperiment, samplingSlots } from '@/lib/probability/sampling';
import type { CodeExample } from '@/lib/types';

export const experiment = samplingExperiment('sampling', { dist: 'die', logN: 2, seed: 1 });

export const numpySampling: CodeExample = {
  id: 'sampling-numpy',
  language: 'python',
  source: `import numpy as np

rng = np.random.default_rng({{seed}})
n = {{n}}
x = {{draw}}
print(x.mean())
print(np.bincount(x) / n)`,
  slots: samplingSlots,
  annotations: [
    {
      id: 'rng',
      range: { line: 3, startCol: 0, endCol: 3 },
      match: 'rng',
      kind: 'variable',
      title: 'rng: a seeded generator',
      what: 'NumPy’s random number generator, started from a seed.',
      why: 'The same seed gives the same sequence every run, so an experiment can be repeated exactly.',
    },
    {
      id: 'default-rng',
      range: { line: 3, startCol: 6, endCol: 27 },
      match: 'np.random.default_rng',
      kind: 'framework',
      title: 'np.random.default_rng(seed)',
      what: 'Creates a Generator using the PCG64 algorithm.',
      why: 'This is NumPy’s recommended interface; the older np.random.seed sets hidden global state.',
    },
    {
      id: 'draw',
      range: { line: 5, startCol: 4, endCol: 12 },
      match: '{{draw}}',
      kind: 'framework',
      title: 'Drawing the sample',
      what: 'n independent draws from the distribution chosen in the experiment.',
      why: 'choice with p= draws outcomes with the given probabilities; binomial counts successes in repeated trials.',
      output: 'An int array of shape (n,)',
    },
    {
      id: 'mean',
      range: { line: 6, startCol: 6, endCol: 14 },
      match: 'x.mean()',
      kind: 'framework',
      title: 'x.mean()',
      what: 'The sample mean: the sum of the draws divided by n.',
      why: 'For large n it settles near the expected value E[X].',
    },
    {
      id: 'bincount',
      range: { line: 7, startCol: 6, endCol: 17 },
      match: 'np.bincount',
      kind: 'framework',
      title: 'np.bincount(x) / n',
      what: 'How often each value 0, 1, 2, … appears, divided by n: the observed frequencies.',
      why: 'These are the bar heights of the histogram. For a die, index 0 is always 0 because no roll is 0.',
    },
  ],
};

/** Python's own random module, pure Python, runs in the browser. */
export const randomRunner: CodeExample = {
  id: 'sampling-runner',
  language: 'python',
  run: 'pyodide',
  source: `import random

random.seed(0)
rolls = [random.randint(1, 6) for _ in range(10000)]
print(sum(rolls) / len(rolls))
print([round(rolls.count(v) / len(rolls), 3) for v in range(1, 7)])`,
  annotations: [],
  expectedOutput: '3.4926\n[0.166, 0.169, 0.17, 0.166, 0.163, 0.167]',
};

/** A fair die with NumPy, seed 0. */
export const numpyDie: CodeExample = {
  id: 'sampling-die',
  language: 'python',
  source: `import numpy as np

rng = np.random.default_rng(0)
rolls = rng.integers(1, 7, size=10_000)    # a fair die: 1 to 6
print(rolls[:10])
print(rolls.mean())
print(np.bincount(rolls, minlength=7)[1:] / len(rolls))`,
  annotations: [
    {
      id: 'integers',
      range: { line: 4, startCol: 8, endCol: 20 },
      match: 'rng.integers',
      kind: 'framework',
      title: 'rng.integers(1, 7, size=...)',
      what: 'Whole numbers from 1 up to but not including 7, each equally likely.',
      why: 'The upper bound is exclusive, as in range(1, 7).',
    },
  ],
  expectedOutput: '[6 4 4 2 2 1 1 1 2 5]\n3.5045\n[0.1689 0.1641 0.164  0.1687 0.1652 0.1691]',
};
