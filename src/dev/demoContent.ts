// Examples for the developer demo page (#/dev/components). Numbers were checked by running the code
// (NumPy 2.5, CPython 3.13); the PyTorch trace is hand-written and therefore labeled simulated.
import { RUNNING_SUM_SOURCE } from '@/lib/trace/runningSum';
import { array } from '@/lib/trace/values';
import type { CodeExample, Exercise, ProjectBrief, QuizQuestion, Trace } from '@/lib/types';

export const matmulExample: CodeExample = {
  id: 'demo-matmul',
  language: 'python',
  source: `import numpy as np
A = np.array([[1, 2, 3], [4, 5, 6]])
B = np.array([[7, 8], [9, 10], [11, 12]])
C = A @ B
print(C.shape)
print(C)`,
  annotations: [
    {
      id: 'import',
      range: { line: 1 },
      kind: 'syntax',
      title: 'import numpy as np',
      what: 'Loads the NumPy library and gives it the short name np.',
      why: 'Every NumPy function below is reached through np.',
    },
    {
      id: 'np-array',
      range: { line: 2, startCol: 4, endCol: 12 },
      match: 'np.array',
      kind: 'framework',
      title: 'np.array(...)',
      what: 'Builds an n-dimensional array from nested Python lists.',
      why: 'The @ operator multiplies NumPy arrays as matrices; plain lists do not support it.',
      inputs: 'A list of 2 rows, each with 3 numbers',
      output: 'An array of shape (2, 3)',
    },
    {
      id: 'A',
      range: { line: 2, startCol: 0, endCol: 1 },
      match: 'A',
      kind: 'variable',
      title: 'A',
      what: 'The left matrix: 2 rows and 3 columns.',
      why: 'Its column count (3) must equal B’s row count for A @ B to be defined.',
      output: 'shape (2, 3)',
    },
    {
      id: 'A-values',
      range: { line: 2, startCol: 13, endCol: 35 },
      match: '[[1, 2, 3], [4, 5, 6]]',
      kind: 'parameter',
      title: 'The values of A',
      what: 'Nested lists: each inner list is one row.',
      why: 'Row-by-row layout is how NumPy reads a 2-D array.',
    },
    {
      id: 'matmul',
      range: { line: 4, startCol: 6, endCol: 7 },
      match: '@',
      kind: 'math',
      title: '@ (matrix multiplication)',
      what: 'Each output entry C[i, j] is the dot product of row i of A and column j of B.',
      why: 'This is the operation the lesson is about.',
      inputs: 'A: (2, 3), B: (3, 2)',
      output: 'C: (2, 2), for example C[0, 0] = 1·7 + 2·9 + 3·11 = 58',
    },
    {
      id: 'C',
      range: { line: 4, startCol: 0, endCol: 1 },
      match: 'C',
      kind: 'variable',
      title: 'C',
      what: 'Holds the product A @ B.',
      why: 'Naming the result lets us inspect its shape and values.',
      output: 'shape (2, 2)',
    },
    {
      id: 'print',
      range: { line: 5, startCol: 0, endCol: 5 },
      match: 'print',
      kind: 'function',
      title: 'print(...)',
      what: 'Writes a value to the output.',
      why: 'Shows the result so you can check it.',
    },
    {
      id: 'shape',
      range: { line: 5, startCol: 6, endCol: 13 },
      match: 'C.shape',
      kind: 'framework',
      title: 'C.shape',
      what: 'The array’s size along each dimension, as a tuple.',
      why: 'Checking shapes is the fastest way to catch matrix bugs.',
      output: '(2, 2)',
    },
  ],
  expectedOutput: '(2, 2)\n[[ 58  64]\n [139 154]]',
};

export const runningSumExample: CodeExample = {
  id: 'demo-running-sum',
  language: 'python',
  source: RUNNING_SUM_SOURCE,
  slots: { xs: (state) => `[${(state as { xs: number[] }).xs.join(', ')}]` },
  annotations: [],
};

export const torchExample: CodeExample = {
  id: 'demo-torch-linear',
  language: 'python',
  source: `import torch
x = torch.tensor([[1.0, 2.0]])
layer = torch.nn.Linear(2, 1)
with torch.no_grad():
    layer.weight.copy_(torch.tensor([[0.5, -1.0]]))
    layer.bias.fill_(0.25)
y = layer(x)`,
  annotations: [],
};

/** Hand-written (simulated): PyTorch can't run in this browser. Linear computes x @ W.T + b. */
export const torchTrace: Trace = {
  source: 'simulated',
  steps: [
    {
      range: { line: 2 },
      vars: { x: array([[1, 2]]) },
      note: 'x is a batch of one example with two features: shape (1, 2).',
    },
    {
      range: { line: 3 },
      vars: { x: array([[1, 2]]) },
      note: 'Linear(2, 1) creates a weight W of shape (1, 2) and a bias b of shape (1,), with random starting values.',
    },
    {
      range: { line: 5 },
      vars: { x: array([[1, 2]]), 'layer.weight': array([[0.5, -1]]) },
      note: 'Overwrite the random weight with known values so the result can be checked by hand.',
    },
    {
      range: { line: 6 },
      vars: { x: array([[1, 2]]), 'layer.weight': array([[0.5, -1]]), 'layer.bias': array([0.25]) },
      note: 'Set the bias to 0.25.',
    },
    {
      range: { line: 7, startCol: 4, endCol: 12 },
      vars: {
        x: array([[1, 2]]),
        'layer.weight': array([[0.5, -1]]),
        'layer.bias': array([0.25]),
        y: array([[-1.25]]),
      },
      note: 'y = x @ W.T + b = 1·0.5 + 2·(−1) + 0.25 = −1.25, shape (1, 1).',
    },
  ],
};

export const squaresExample: CodeExample = {
  id: 'demo-squares',
  language: 'python',
  source: `def square(n):
    result = n * n
    return result

total = 0
for k in [1, 2, 3]:
    total = total + square(k)
print(total)`,
  annotations: [],
};

export const stagesExample: CodeExample = {
  id: 'demo-matmul-stages',
  language: 'python',
  source: '',
  annotations: [],
  stages: [
    {
      id: 'loops',
      title: 'Triple loop',
      note: 'Every entry C[i][j] adds up A[i][k] · B[k][j] over k. Three nested loops make each multiply-add explicit.',
      source: `A = [[1, 2, 3], [4, 5, 6]]
B = [[7, 8], [9, 10], [11, 12]]
C = [[0, 0], [0, 0]]
for i in range(2):
    for j in range(2):
        for k in range(3):
            C[i][j] += A[i][k] * B[k][j]
print(C)`,
    },
    {
      id: 'rows-cols',
      title: 'Row · column',
      note: 'The inner loop is a dot product of a row of A and a column of B, so we write it as one. zip(*B) turns B’s rows into its columns.',
      source: `A = [[1, 2, 3], [4, 5, 6]]
B = [[7, 8], [9, 10], [11, 12]]
cols = list(zip(*B))
C = [[sum(a * b for a, b in zip(row, col)) for col in cols] for row in A]
print(C)`,
    },
    {
      id: 'numpy',
      title: 'A @ B',
      note: 'NumPy does the same multiply-adds in compiled code. Same result: [[58, 64], [139, 154]].',
      source: `import numpy as np
A = np.array([[1, 2, 3], [4, 5, 6]])
B = np.array([[7, 8], [9, 10], [11, 12]])
C = A @ B
print(C)`,
    },
  ],
};

export const questions: QuizQuestion[] = [
  {
    id: 'shape',
    type: 'choice',
    prompt: 'A has shape (2, 3) and B has shape (3, 2). What is the shape of A @ B?',
    options: [
      {
        text: '(2, 2)',
        correct: true,
        explain: 'The result takes its rows from A (2) and its columns from B (2).',
      },
      {
        text: '(3, 3)',
        correct: false,
        explain: 'That would be B @ A. Order matters: A @ B keeps A’s rows and B’s columns.',
      },
      {
        text: '(2, 3)',
        correct: false,
        explain:
          'The shared dimension 3 is summed away in each dot product, so it does not appear in the result.',
      },
    ],
  },
  {
    id: 'entry',
    type: 'numeric',
    prompt: 'Using A and B above, what is C[1][0]?',
    answer: 139,
    tolerance: 0,
    hint: 'Row 1 of A is [4, 5, 6] and column 0 of B is [7, 9, 11]. Multiply the pairs, then add.',
    explain: '4·7 + 5·9 + 6·11 = 28 + 45 + 66 = 139.',
  },
  {
    id: 'steps',
    type: 'order',
    prompt: 'Put the steps for computing one entry C[i][j] in order.',
    items: [
      'Check that A’s column count equals B’s row count',
      'Take row i of A and column j of B',
      'Multiply the paired numbers',
      'Add the products',
    ],
    explain: 'Shapes first, then pair up, multiply and sum: that is one dot product.',
  },
];

export const dotExercise: Exercise = {
  id: 'dot',
  prompt:
    'Write a function `dot(a, b)` that returns the dot product of two equal-length lists, without NumPy.',
  starter: 'def dot(a, b):\n    # your code here\n    pass',
  hints: ['Pair up the items with `zip(a, b)`.', 'Multiply each pair and add the results with `sum(...)`.'],
  solution: 'def dot(a, b):\n    return sum(x * y for x, y in zip(a, b))',
  explanation:
    '`zip` pairs a[0] with b[0], a[1] with b[1], and so on. The generator multiplies each pair and `sum` adds them: 1·3 + 2·4 = 11.',
  tests:
    "assert dot([1, 2], [3, 4]) == 11, 'dot([1, 2], [3, 4]) should be 11'\nassert dot([], []) == 0, 'the dot product of empty lists is 0'",
};

export const mismatch = {
  title: 'Multiplying matrices whose inner sizes differ',
  wrong: 'A = np.array([[1, 2, 3], [4, 5, 6]])  # shape (2, 3)\nA @ A',
  error:
    'ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 2 is different from 3)',
  cause:
    'A @ B needs A’s column count to equal B’s row count. Here A has 3 columns but the second A has 2 rows. NumPy calls the shared size `k` in the signature.',
  fix: 'A @ A.T  # (2, 3) @ (3, 2) -> (2, 2)',
};

export const brief: ProjectBrief = {
  goal: 'Implement matrix multiplication three ways and confirm they agree.',
  dataset: 'No dataset: use small random integer matrices you generate yourself.',
  milestones: [
    'Write the triple-loop version',
    'Write the row · column version',
    'Compare both with `A @ B` on 100 random pairs',
    'Add a clear error for mismatched shapes',
  ],
  rubric: [
    { criterion: 'Correctness', detail: 'All three versions give identical results on every test pair.' },
    { criterion: 'Shape checks', detail: 'Mismatched shapes raise an error that names both shapes.' },
  ],
  hints: ['Use `np.random.default_rng(0).integers(0, 10, size=(2, 3))` so your results are reproducible.'],
};
