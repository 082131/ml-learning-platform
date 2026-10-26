// Code for "NumPy arrays: shape, dtype and indexing". Outputs were produced by running the code with
// CPython 3.13 + NumPy 2.5 and with Pyodide 314.0.7 (Python 3.14, NumPy 2.4). They print the same, except
// that the default integer dtype is int32 in Pyodide and int64 on a 64-bit computer (see testSetup.ts).
// The indexing in the experiment is checked against NumPy in src/lib/foundations/arrayIndexing.test.ts.
import { lineOf, span } from '@/lib/foundations/annotate';
import { arrayText, indexExperiment, indexText, type IndexState } from '@/lib/foundations/arrayIndexing';
import type { CodeExample } from '@/lib/types';

/** One state: the shape explorer, the code and the readout read it. */
export const experiment = indexExperiment('array-index', { shape: '3,4', kind: 'element', i: 1, j: 2 });

const st = (s: unknown) => s as IndexState;
const INDEX_SOURCE = `import numpy as np

a = {{array}}
print(a.shape)
part = {{index}}
print(part)
print(part.shape)`;

export const indexCode: CodeExample = {
  id: 'index-code',
  language: 'python',
  source: INDEX_SOURCE,
  slots: {
    array: (s) => arrayText(st(s).shape),
    index: (s) => indexText(st(s).kind, st(s).i, st(s).j),
  },
  annotations: [
    {
      id: 'import',
      ...span(INDEX_SOURCE, 1, 'import numpy as np'),
      kind: 'framework',
      title: 'import numpy as np',
      what: 'Loads the NumPy library under the short name np, as almost all Python code does.',
      why: 'NumPy is not built into Python. In this site it runs in your browser through Pyodide.',
    },
    {
      id: 'arange',
      ...span(INDEX_SOURCE, 3, '{{array}}'),
      kind: 'function',
      title: 'np.arange(12).reshape(rows, cols)',
      what: 'np.arange(12) makes the numbers 0 to 11 in a 1-D array; reshape arranges the same 12 numbers in a grid, row by row.',
      why: 'Because the value of each element is its position in memory, you can see where reshape puts every number.',
      output: 'an array of 12 integers',
    },
    {
      id: 'shape',
      ...span(INDEX_SOURCE, 4, 'a.shape'),
      kind: 'variable',
      title: 'a.shape',
      what: 'A tuple with the size of each axis: (3, 4) means 3 rows (axis 0) and 4 columns (axis 1).',
      why: 'Checking shapes is the fastest way to find bugs in numeric code.',
    },
    {
      id: 'index',
      ...span(INDEX_SOURCE, 5, '{{index}}'),
      kind: 'syntax',
      title: 'Indexing an array',
      what: 'One index per axis, separated by a comma. A plain number picks one position along that axis and removes the axis; a slice such as : or 1: keeps it.',
      why: 'a[1, 2] is one number, a[1] is a whole row, a[:, 2] a whole column.',
      inputs: 'the index and i, j from the controls above',
    },
    {
      id: 'part-shape',
      ...span(INDEX_SOURCE, lineOf(INDEX_SOURCE, 'part.shape'), 'part.shape'),
      kind: 'variable',
      title: 'part.shape',
      what: 'The shape of the result. A single number has shape (), an empty tuple.',
      why: 'Each plain-number index removes one axis, so you can predict this before running.',
    },
  ],
};

/** Creating, reshaping and indexing arrays, in the browser with Pyodide. */
export const arraysRunner: CodeExample = {
  id: 'arrays-runner',
  language: 'python',
  run: 'pyodide',
  source: `import numpy as np

heights = np.array([1.62, 1.75, 1.80, 1.68])
print(heights, heights.shape, heights.dtype)
print(heights[0], heights[-1], heights[1:3])

a = np.arange(12)
print(a, a.dtype)
m = a.reshape(3, 4)
print(m)
print(m.shape, m.ndim, m.size)
print(m[1, 2], m[1], m[:, 2])
print(a.reshape(2, -1).shape)

nums = [1, 2, 3]
print(nums * 2)
print(np.array(nums) * 2)

data = np.array([[5.1, 3.5, 0], [4.9, 3.0, 0], [6.3, 3.3, 1]])
X = data[:, :2]
y = data[:, 2]
print(X.shape, y.shape)
print(y)`,
  annotations: [],
  expectedOutput: `[1.62 1.75 1.8  1.68] (4,) float64
1.62 1.68 [1.75 1.8 ]
[ 0  1  2  3  4  5  6  7  8  9 10 11] int32
[[ 0  1  2  3]
 [ 4  5  6  7]
 [ 8  9 10 11]]
(3, 4) 2 12
6 [4 5 6 7] [ 2  6 10]
(2, 6)
[1, 2, 3, 1, 2, 3]
[2 4 6]
(3, 2) (3,)
[0. 0. 1.]`,
};
