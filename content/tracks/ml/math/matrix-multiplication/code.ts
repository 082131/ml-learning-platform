// Code for the reference lesson. Outputs and error messages were produced by running the code with
// NumPy 2.5.3 on CPython 3.13; the product and its printout are also checked in src/lib/math tests.
import { matmulExperiment, type MatMulState } from '@/lib/math/matmulExperiment';
import { pythonList } from '@/lib/math/numpyFormat';
import { MATMUL_LOOP_SOURCE, matmulLoopSlots } from '@/lib/trace/matmul';
import type { CodeExample } from '@/lib/types';

/** Quantities: 2 shoppers (rows) × 3 items (columns). */
export const A = [
  [1, 2, 3],
  [4, 5, 6],
];
/** Prices: 3 items (rows) × 2 stores (columns). */
export const B = [
  [7, 8],
  [9, 10],
  [11, 12],
];

const LOOP_ID = 'matmul-loop';

/** One state for the whole lesson: the grid, both code blocks, the trace and the readout read it. */
export const experiment = matmulExperiment('matmul', A, B, LOOP_ID);

const st = (s: unknown) => s as MatMulState;

export const numpyMatmul: CodeExample = {
  id: 'matmul-numpy',
  language: 'python',
  source: `import numpy as np

A = np.array({{A}})
B = np.array({{B}})
C = A @ B
print(C.shape)
print(C)`,
  slots: { A: (s) => pythonList(st(s).A), B: (s) => pythonList(st(s).B) },
  annotations: [
    {
      id: 'import',
      range: { line: 1 },
      kind: 'syntax',
      title: 'import numpy as np',
      what: 'Loads NumPy, the standard Python library for arrays, and names it np.',
      why: 'Python lists have no matrix multiplication. NumPy arrays do, and np is the name every NumPy tutorial uses.',
    },
    {
      id: 'A',
      range: { line: 3, startCol: 0, endCol: 1 },
      match: 'A',
      kind: 'variable',
      title: 'A',
      what: 'The left matrix: one row per shopper, one column per item.',
      why: 'Its number of columns must equal the number of rows of B, because each column of A pairs with a row of B.',
      output: 'An array of shape (m, n), (2, 3) to start with',
    },
    {
      id: 'np-array',
      range: { line: 3, startCol: 4, endCol: 12 },
      match: 'np.array',
      kind: 'framework',
      title: 'np.array(...)',
      what: 'Builds a NumPy array from nested Python lists. Each inner list becomes one row.',
      why: 'The @ operator below works on NumPy arrays, and the array records its shape.',
      inputs: 'A list of rows, all the same length',
      output: 'A 2-D array whose shape is (number of rows, row length)',
    },
    {
      id: 'A-values',
      range: { line: 3, startCol: 13, endCol: 18 },
      match: '{{A}}',
      kind: 'parameter',
      title: 'The numbers in A',
      what: 'The current values of A in the experiment, written as a list of rows.',
      why: 'This literal is filled from the same state as the grid, so editing a cell changes this code too.',
    },
    {
      id: 'B',
      range: { line: 4, startCol: 0, endCol: 1 },
      match: 'B',
      kind: 'variable',
      title: 'B',
      what: 'The right matrix: one row per item, one column per store.',
      why: 'Its rows line up with the columns of A: row k of B holds the prices of item k.',
      output: 'An array of shape (n, p), (3, 2) to start with',
    },
    {
      id: 'C',
      range: { line: 5, startCol: 0, endCol: 1 },
      match: 'C',
      kind: 'variable',
      title: 'C',
      what: 'The product. C[i, j] is what shopper i pays at store j.',
      why: 'Naming the result lets us print its shape and values.',
      output: 'An array of shape (m, p)',
    },
    {
      id: 'matmul',
      range: { line: 5, startCol: 6, endCol: 7 },
      match: '@',
      kind: 'math',
      title: '@ (matrix multiplication)',
      what: 'Computes every C[i, j] as the dot product of row i of A and column j of B.',
      why: 'One operator replaces the three nested loops, and NumPy runs them in compiled code.',
      inputs: 'A: (m, n) and B: (n, p). The inner sizes n must match',
      output: 'C: (m, p). With mismatched inner sizes it raises ValueError',
    },
    {
      id: 'print',
      range: { line: 6, startCol: 0, endCol: 5 },
      match: 'print',
      kind: 'function',
      title: 'print(...)',
      what: 'Writes a value to the output.',
      why: 'We print the shape first, because checking shapes is the quickest way to catch a matrix bug.',
    },
    {
      id: 'shape',
      range: { line: 6, startCol: 6, endCol: 13 },
      match: 'C.shape',
      kind: 'framework',
      title: 'C.shape',
      what: 'A tuple with the size of each dimension: (rows, columns).',
      why: 'It should equal (rows of A, columns of B).',
      output: '(2, 2) for the starting matrices',
    },
    {
      id: 'print-C',
      range: { line: 7 },
      kind: 'function',
      title: 'print(C)',
      what: 'Prints the array row by row, with the numbers right-aligned in columns.',
      why: 'The readout below shows exactly what this line prints for the current values.',
    },
  ],
};

export const loopMatmul: CodeExample = {
  id: LOOP_ID,
  language: 'python',
  source: MATMUL_LOOP_SOURCE,
  slots: Object.fromEntries(
    ['A', 'B', 'm', 'n', 'p'].map((name) => [name, (s: unknown) => matmulLoopSlots(st(s).A, st(s).B)[name]!]),
  ),
  annotations: [
    {
      id: 'zeros',
      range: { line: 3 },
      kind: 'syntax',
      title: 'C = [[0] * p for _ in range(m)]',
      what: 'Creates m separate rows, each a list of p zeros.',
      why: 'The loop adds into C, so every entry must start at 0. Writing [[0] * p] * m instead would repeat one row object m times, and adding to one row would change them all.',
      output: 'A list of m rows of p zeros',
    },
    {
      id: 'loop-i',
      range: { line: 4, startCol: 9, endCol: 21 },
      match: 'range({{m}})',
      kind: 'function',
      title: 'range(m)',
      what: 'Counts i = 0, 1, …, m − 1: one pass per row of A (and of C).',
      why: 'C has one row per row of A.',
    },
    {
      id: 'loop-j',
      range: { line: 5, startCol: 13, endCol: 25 },
      match: 'range({{p}})',
      kind: 'function',
      title: 'range(p)',
      what: 'Counts j = 0, 1, …, p − 1: one pass per column of B (and of C).',
      why: 'C has one column per column of B.',
    },
    {
      id: 'loop-k',
      range: { line: 6, startCol: 17, endCol: 29 },
      match: 'range({{n}})',
      kind: 'function',
      title: 'range(n)',
      what: 'Counts k = 0, 1, …, n − 1 over the shared dimension.',
      why: 'k walks along row i of A and down column j of B at the same time. This is the dot product.',
    },
    {
      id: 'Cij',
      range: { line: 7, startCol: 12, endCol: 19 },
      match: 'C[i][j]',
      kind: 'variable',
      title: 'C[i][j]',
      what: 'The entry in row i, column j of the result.',
      why: 'It collects one product per value of k.',
    },
    {
      id: 'plus-eq',
      range: { line: 7, startCol: 20, endCol: 22 },
      match: '+=',
      kind: 'syntax',
      title: '+=',
      what: 'Adds the right-hand side to C[i][j] and stores the sum back.',
      why: 'A dot product is a running sum of products.',
    },
    {
      id: 'Aik',
      range: { line: 7, startCol: 23, endCol: 30 },
      match: 'A[i][k]',
      kind: 'variable',
      title: 'A[i][k]',
      what: 'Row i, column k of A: how many of item k shopper i buys.',
      why: 'For a fixed i, k moves along a row of A.',
    },
    {
      id: 'times',
      range: { line: 7, startCol: 31, endCol: 32 },
      match: '*',
      kind: 'math',
      title: '* (multiply two numbers)',
      what: 'Multiplies one quantity by one price.',
      why: 'Here * multiplies plain numbers. On two NumPy arrays, * multiplies element by element, which is not matrix multiplication.',
    },
    {
      id: 'Bkj',
      range: { line: 7, startCol: 33, endCol: 40 },
      match: 'B[k][j]',
      kind: 'variable',
      title: 'B[k][j]',
      what: 'Row k, column j of B: the price of item k at store j.',
      why: 'For a fixed j, k moves down a column of B.',
    },
  ],
};

/** The same product written three ways, for ProgressiveCode. Every stage prints [[58, 64], [139, 154]]. */
export const matmulStages: CodeExample = {
  id: 'matmul-stages',
  language: 'python',
  source: '',
  annotations: [],
  stages: [
    {
      id: 'loops',
      title: 'Triple loop',
      note: 'Every multiply-add is written out. Three loops: rows of A, columns of B, and the shared index k.',
      source: `A = ${pythonList(A)}
B = ${pythonList(B)}
C = [[0] * 2 for _ in range(2)]
for i in range(2):
    for j in range(2):
        for k in range(3):
            C[i][j] += A[i][k] * B[k][j]
print(C)`,
    },
    {
      id: 'row-col',
      title: 'Row · column',
      note: 'The k loop is a dot product, so we write it as one. zip(*B) turns the rows of B into its columns.',
      source: `A = ${pythonList(A)}
B = ${pythonList(B)}
columns = list(zip(*B))
C = [[sum(a * b for a, b in zip(row, col)) for col in columns] for row in A]
print(C)`,
    },
    {
      id: 'numpy',
      title: 'A @ B',
      note: 'NumPy does the same multiply-adds in compiled code. The result is now an array, so it prints without commas.',
      source: `import numpy as np
A = np.array(${pythonList(A)})
B = np.array(${pythonList(B)})
C = A @ B
print(C)`,
    },
  ],
};

/** Runs in the browser with Pyodide. Pure Python, so it needs no package download beyond Python itself. */
export const loopRunner: CodeExample = {
  id: 'matmul-runner',
  language: 'python',
  run: 'pyodide',
  source: `A = ${pythonList(A)}
B = ${pythonList(B)}

C = [[0] * len(B[0]) for _ in range(len(A))]
for i in range(len(A)):
    for j in range(len(B[0])):
        for k in range(len(B)):
            C[i][j] += A[i][k] * B[k][j]
print(C)`,
  annotations: [],
  expectedOutput: '[[58, 64], [139, 154]]',
};

/** A batch of inputs through a linear layer: the matrix multiplication inside every neural network. */
export const linearLayer: CodeExample = {
  id: 'matmul-linear-layer',
  language: 'python',
  source: `import numpy as np

rng = np.random.default_rng(0)
X = rng.normal(size=(32, 784))
W = rng.normal(size=(784, 128))
H = X @ W
print(H.shape)`,
  annotations: [
    {
      id: 'X',
      range: { line: 4, startCol: 0, endCol: 1 },
      match: 'X',
      kind: 'variable',
      title: 'X: a batch of inputs',
      what: '32 examples, each with 784 numbers (for example 28 × 28 pixel images flattened into rows).',
      why: 'Rows are examples and columns are features: the usual layout for a batch.',
      output: 'shape (32, 784)',
    },
    {
      id: 'normal',
      range: { line: 4, startCol: 4, endCol: 14 },
      match: 'rng.normal',
      kind: 'framework',
      title: 'rng.normal(size=...)',
      what: 'Draws random numbers from a normal distribution in the requested shape.',
      why: 'Stand-in data: only the shapes matter for this example. The seed 0 makes it reproducible.',
    },
    {
      id: 'W',
      range: { line: 5, startCol: 0, endCol: 1 },
      match: 'W',
      kind: 'variable',
      title: 'W: the layer’s weights',
      what: 'One row per input feature (784) and one column per output feature (128).',
      why: 'Training adjusts these numbers. Each column is one output’s weights.',
      output: 'shape (784, 128)',
    },
    {
      id: 'XW',
      range: { line: 6, startCol: 4, endCol: 9 },
      match: 'X @ W',
      kind: 'math',
      title: 'X @ W',
      what: 'Every example’s 784 features are combined into 128 outputs at once.',
      why: '(32, 784) @ (784, 128): the inner sizes match, so the result has shape (32, 128).',
      output: 'H with shape (32, 128): 32 · 784 · 128 = 3,211,264 multiply-adds',
    },
  ],
  expectedOutput: '(32, 128)',
};
