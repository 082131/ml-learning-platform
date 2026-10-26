// Code for statistics-intuition. Outputs were produced by running the code with NumPy 2.5.3 on CPython 3.13.
// The simulator uses its own seeded generator, so no NumPy output is claimed for its settings.
import { confounderExperiment } from '@/lib/statistics/confounder';
import type { CodeExample } from '@/lib/types';

export const experiment = confounderExperiment('confounder', { view: 'all', effect: 1, seed: 1 });

export const describeCode: CodeExample = {
  id: 'stats-describe',
  language: 'python',
  source: `import numpy as np

sales = np.array([52, 61, 58, 70, 95, 104, 88, 99])   # ice creams sold per day
burns = np.array([5, 4, 7, 6, 14, 15, 16, 17])        # sunburn cases per day
print(sales.mean())
print(sales.var(), sales.std())
print(sales.std(ddof=1))
print(np.corrcoef(sales, burns)[0, 1])`,
  annotations: [
    {
      id: 'mean',
      range: { line: 5, startCol: 6, endCol: 18 },
      match: 'sales.mean()',
      kind: 'framework',
      title: 'sales.mean()',
      what: 'The sum of the values divided by how many there are: 627 / 8 = 78.375.',
      why: 'The mean is the balance point of the data, and the reference point for the spread.',
    },
    {
      id: 'var',
      range: { line: 6, startCol: 6, endCol: 17 },
      match: 'sales.var()',
      kind: 'framework',
      title: 'sales.var()',
      what: 'The mean squared distance from the mean, dividing by n (ddof=0).',
      why: 'It is in squared units (ice creams²), which is why the standard deviation, its square root, is easier to read.',
    },
    {
      id: 'ddof',
      range: { line: 7, startCol: 16, endCol: 22 },
      match: 'ddof=1',
      kind: 'framework',
      title: 'ddof=1',
      what: 'Divides by n − 1 instead of n: the sample standard deviation.',
      why: 'It corrects the tendency of a small sample to underestimate the spread. pandas’ .std() uses ddof=1 by default; NumPy uses 0.',
      output: '20.47254258757324 instead of 19.15031004970938',
    },
    {
      id: 'corrcoef',
      range: { line: 8, startCol: 6, endCol: 17 },
      match: 'np.corrcoef',
      kind: 'framework',
      title: 'np.corrcoef(x, y)',
      what: 'The 2 × 2 correlation matrix of x and y; [0, 1] picks the correlation between them.',
      why: 'The diagonal is each variable’s correlation with itself, always 1.',
    },
  ],
  expectedOutput: '78.375\n366.734375 19.15031004970938\n20.47254258757324\n0.9268352590991498',
};

export const splitCode: CodeExample = {
  id: 'stats-split',
  language: 'python',
  source: `import numpy as np

sales = np.array([52, 61, 58, 70, 95, 104, 88, 99])
burns = np.array([5, 4, 7, 6, 14, 15, 16, 17])
summer = np.array([False, False, False, False, True, True, True, True])
print(np.corrcoef(sales, burns)[0, 1])
print(np.corrcoef(sales[summer], burns[summer])[0, 1])
print(np.corrcoef(sales[~summer], burns[~summer])[0, 1])`,
  annotations: [
    {
      id: 'mask',
      range: { line: 7, startCol: 18, endCol: 31 },
      match: 'sales[summer]',
      kind: 'framework',
      title: 'sales[summer]',
      what: 'Boolean indexing: keeps the entries where summer is True.',
      why: 'Comparing like with like: within one season the season cannot drive the relationship.',
    },
    {
      id: 'not',
      range: { line: 8, startCol: 18, endCol: 32 },
      match: 'sales[~summer]',
      kind: 'framework',
      title: '~summer',
      what: 'Flips every True to False and back: the winter days.',
      why: 'Use ~ on NumPy boolean arrays; Python’s not works only on a single value.',
    },
  ],
  expectedOutput: '0.9268352590991498\n-0.07641607199008701\n0.15491933384829668',
};

/** The standard library's statistics module, pure Python, runs in the browser. */
export const statsRunner: CodeExample = {
  id: 'stats-runner',
  language: 'python',
  run: 'pyodide',
  source: `import statistics

sales = [52, 61, 58, 70, 95, 104, 88, 99]
burns = [5, 4, 7, 6, 14, 15, 16, 17]
print(statistics.mean(sales))
print(statistics.pvariance(sales), statistics.variance(sales))
print(round(statistics.stdev(sales), 4))
print(round(statistics.correlation(sales, burns), 4))`,
  annotations: [],
  expectedOutput: '78.375\n366.734375 419.125\n20.4725\n0.9268',
};
