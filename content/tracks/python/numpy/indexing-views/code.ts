// Code for "NumPy indexing, views and copies". Runnable examples were run with CPython 3.13 and NumPy 2.5
// and their output copied; content/tracks/python/python-outputs.test.ts re-runs them. The view explorer was
// recorded by src/lib/pycourse/fixtures/views.py (np.shares_memory after each operation).
import { span } from '@/lib/foundations/annotate';
import { recordedExperiment, recordedSlots, type RecordedFixture } from '@/lib/pycourse/recorded';
import fixture from '@/lib/pycourse/fixtures/views.json';
import type { CodeExample } from '@/lib/types';

const views = fixture as RecordedFixture;
const SRC = views.template;

export const experiment = recordedExperiment('py-views', views, 'Indexing');

export const viewsCode: CodeExample = {
  id: 'py-views-code',
  language: 'python',
  source: SRC,
  slots: recordedSlots(views),
  annotations: [
    {
      id: 'arange',
      ...span(SRC, 3, 'np.arange(12).reshape(3, 4)'),
      kind: 'function',
      title: 'A 3 × 4 array of 0 to 11',
      what: 'arange(12) makes 0, 1, …, 11 and reshape(3, 4) arranges them in 3 rows of 4.',
      why: 'Each value equals its position in memory, so you can see exactly which elements an index picks.',
      output: 'shape (3, 4)',
    },
    {
      id: 'expr',
      ...span(SRC, 4, '{{expr}}'),
      kind: 'syntax',
      title: 'The indexing operation',
      what: 'Basic slicing, single indices, reshape, .T and ravel return views when they can. Lists of positions, boolean masks, flatten and copy always return new arrays.',
      why: 'A view costs no memory and no time, but writing into it writes into a.',
      inputs: 'the operation chosen above',
    },
    {
      id: 'write',
      ...span(SRC, 5, 'sub[...] = -1'),
      kind: 'syntax',
      title: 'Writing into every element',
      what: 'sub[...] = -1 assigns -1 to all of sub’s elements, whatever its shape.',
      why: 'If sub is a view, these writes land in a’s memory.',
    },
    {
      id: 'shares',
      ...span(SRC, 7, 'np.shares_memory(a, sub)'),
      kind: 'function',
      title: 'np.shares_memory',
      what: 'True if the two arrays use any of the same memory.',
      why: 'The reliable way to tell a view from a copy when you are unsure.',
      output: 'True or False',
    },
  ],
};

/** Reductions along an axis, keepdims, centering, argmax and np.where on a small score table. */
export const axisRunner: CodeExample = {
  id: 'py-views-axis',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

# 4 students (rows) x 3 exams (columns)
scores = np.array([[70., 85., 90.],
                   [60., 75., 80.],
                   [90., 95., 85.],
                   [50., 65., 70.]])
print(scores.shape)

print(scores.mean(axis=0))                 # one mean per exam (collapses rows)
print(scores.mean(axis=1))                 # one mean per student (collapses columns)
print(scores.mean(axis=1, keepdims=True).shape)

centered = scores - scores.mean(axis=0)    # (4, 3) - (3,) broadcasts per column
print(centered[0])
row_centered = scores - scores.mean(axis=1, keepdims=True)  # (4, 3) - (4, 1)
print(row_centered[0])

print(scores.argmax(axis=0))               # best student per exam
passed = scores >= 70
print(passed.sum(axis=1))                  # exams passed per student
print(np.where(scores >= 70, scores, 0)[3])`,
  annotations: [],
  expectedOutput: `(4, 3)
[67.5  80.   81.25]
[81.66666667 71.66666667 90.         61.66666667]
(4, 1)
[2.5  5.   8.75]
[-11.66666667   3.33333333   8.33333333]
[2 2 0]
[3 2 3 1]
[ 0.  0. 70.]`,
};

/** Combining masks, argsort, repeated fancy indexing, and assignment through a mask. */
export const masksRunner: CodeExample = {
  id: 'py-views-masks',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

ages = np.array([23, 41, 35, 19, 52, 30])
income = np.array([28., 61., 47., 0., 80., 39.])

mid = (ages >= 25) & (ages < 50)           # & with parentheses, never "and"
print(mid)
print(ages[mid], income[mid].mean())

order = np.argsort(income)[::-1]           # positions from highest to lowest income
print(order[:3], ages[order[:3]])

picked = ages[[0, 0, 5]]                   # fancy indexing can repeat positions
print(picked, picked.shape)

income[income == 0] = np.nan               # assignment through a mask writes into income
print(income)`,
  annotations: [],
  expectedOutput: `[False  True  True False False  True]
[41 35 30] 49.0
[4 1 2] [52 41 35]
[23 23 30] (3,)
[28. 61. 47. nan 80. 39.]`,
};
