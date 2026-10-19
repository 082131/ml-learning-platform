// Code for matrices. Outputs and error messages were produced by running the code with NumPy 2.5.3
// on CPython 3.13; the readout's printouts are checked against NumPy in src/lib/linalg tests.
import { matrixOpsExperiment, matrixOpsSlots } from '@/lib/linalg/matrixOps';
import type { CodeExample } from '@/lib/types';

export const A = [
  [1, 2, 3],
  [4, 5, 6],
];
export const B = [
  [10, 0, -1],
  [2, 3, 4],
];

export const experiment = matrixOpsExperiment('matrices', A, B);

export const numpyMatrices: CodeExample = {
  id: 'matrices-numpy',
  language: 'python',
  source: `import numpy as np

A = np.array({{A}})
B = np.array({{B}})
print(A.shape)
print(A[{{i}}, {{j}}])
print(A[{{i}}])
print(A + B)
print(A.T)
print(A.T.shape)`,
  slots: matrixOpsSlots,
  annotations: [
    {
      id: 'A',
      range: { line: 3, startCol: 0, endCol: 1 },
      match: 'A',
      kind: 'variable',
      title: 'A',
      what: 'A 2-D array: each inner list is one row.',
      why: 'Its literal is the grid you edit above.',
      output: 'shape (rows, columns), (2, 3) to start with',
    },
    {
      id: 'shape',
      range: { line: 5, startCol: 6, endCol: 13 },
      match: 'A.shape',
      kind: 'framework',
      title: 'A.shape',
      what: 'A tuple (rows, columns).',
      why: 'Rows come first, always. Most matrix bugs show up first as an unexpected shape.',
    },
    {
      id: 'index',
      range: { line: 6, startCol: 6, endCol: 21 },
      match: 'A[{{i}}, {{j}}]',
      kind: 'syntax',
      title: 'A[i, j]',
      what: 'The entry in row i, column j, both counted from 0.',
      why: 'Selecting an entry in the visual changes i and j here.',
      output: 'One number',
    },
    {
      id: 'row',
      range: { line: 7, startCol: 6, endCol: 14 },
      match: 'A[{{i}}]',
      kind: 'syntax',
      title: 'A[i]',
      what: 'With one index you get a whole row, as a 1-D array.',
      why: 'In a dataset matrix, one row is one example’s feature vector.',
      output: 'shape (columns,)',
    },
    {
      id: 'add',
      range: { line: 8, startCol: 8, endCol: 9 },
      match: '+',
      kind: 'math',
      title: 'A + B',
      what: 'Adds entries in matching positions.',
      why: 'Addition is element-wise, so both matrices must have the same shape.',
      output: 'A matrix of the same shape',
    },
    {
      id: 'T',
      range: { line: 9, startCol: 6, endCol: 9 },
      match: 'A.T',
      kind: 'framework',
      title: 'A.T (transpose)',
      what: 'Swaps rows and columns: entry [i, j] moves to [j, i].',
      why: 'Shapes often need flipping to line up, for example X.T @ X in linear regression.',
      output: 'shape (columns, rows)',
    },
  ],
};

/** Pure Python transpose, runs in the browser. */
export const transposeRunner: CodeExample = {
  id: 'matrices-runner',
  language: 'python',
  run: 'pyodide',
  source: `A = [[1, 2, 3], [4, 5, 6]]

T = [list(col) for col in zip(*A)]
print(T)
print(len(A), len(A[0]))   # rows, columns
print(A[1][2])             # lists need two brackets`,
  annotations: [],
  expectedOutput: '[[1, 4], [2, 5], [3, 6]]\n2 3\n6',
};

/** A small dataset as a matrix: rows are houses, columns are features. */
export const dataset: CodeExample = {
  id: 'matrices-dataset',
  language: 'python',
  source: `import numpy as np

# columns: area in m², rooms, age in years
X = np.array([[120.0, 3, 15],
              [85.0, 2, 40],
              [60.0, 1, 5],
              [150.0, 4, 22]])
print(X.shape)
print(X[:, 0])
print(X.mean(axis=0))`,
  annotations: [
    {
      id: 'X',
      range: { line: 4, startCol: 0, endCol: 1 },
      match: 'X',
      kind: 'variable',
      title: 'X: the design matrix',
      what: 'One row per example (4 houses), one column per feature (3).',
      why: 'This layout is what NumPy, pandas and scikit-learn expect.',
      output: 'shape (4, 3)',
    },
    {
      id: 'col',
      range: { line: 9, startCol: 6, endCol: 13 },
      match: 'X[:, 0]',
      kind: 'syntax',
      title: 'X[:, 0]',
      what: 'Every row (:), column 0: the area of each house.',
      why: 'One column is one feature across all examples.',
      output: 'shape (4,)',
    },
    {
      id: 'mean',
      range: { line: 10, startCol: 6, endCol: 20 },
      match: 'X.mean(axis=0)',
      kind: 'framework',
      title: 'X.mean(axis=0)',
      what: 'The average down each column: one mean per feature.',
      why: 'axis=0 collapses the rows. Scaling features (later in the track) starts from these means.',
      output: 'shape (3,)',
    },
  ],
  expectedOutput: '(4, 3)\n[120.  85.  60. 150.]\n[103.75   2.5   20.5 ]',
};
