import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'result-shape',
    type: 'choice',
    prompt: 'A has shape (4, 3) and B has shape (3, 5). What is the shape of A @ B?',
    options: [
      {
        text: '(4, 5)',
        correct: true,
        explain: 'The result keeps the rows of A (4) and the columns of B (5).',
      },
      {
        text: '(3, 3)',
        correct: false,
        explain: 'The shared size 3 is summed over inside each entry, so it does not appear in the result.',
      },
      {
        text: '(5, 4)',
        correct: false,
        explain:
          'That would be the shape of (A @ B).T, or of B.T @ A.T. Order matters: rows come from the left matrix.',
      },
      {
        text: 'It can’t be computed',
        correct: false,
        explain: 'It can: A has 3 columns and B has 3 rows, and those are the sizes that must match.',
      },
    ],
  },
  {
    id: 'entry',
    type: 'numeric',
    prompt:
      'With A = [[1, 2, 3], [4, 5, 6]] and B = [[7, 8], [9, 10], [11, 12]], what is C[1][1] in C = A @ B?',
    answer: 154,
    tolerance: 0,
    hint: 'Use row 1 of A, [4, 5, 6], and column 1 of B, [8, 10, 12]. Multiply the pairs, then add.',
    explain: '4·8 + 5·10 + 6·12 = 32 + 50 + 72 = 154.',
  },
  {
    id: 'star',
    type: 'choice',
    prompt: 'A and B are NumPy arrays of shape (2, 3) and (3, 2). What does A * B do?',
    options: [
      {
        text: 'Raises ValueError: operands could not be broadcast together',
        correct: true,
        explain:
          '* multiplies element by element, which needs equal (or broadcastable) shapes. (2, 3) and (3, 2) are not.',
      },
      {
        text: 'Returns the matrix product, shape (2, 2)',
        correct: false,
        explain: 'In NumPy the matrix product is @ (or np.matmul). * is element-wise.',
      },
      {
        text: 'Returns shape (3, 3)',
        correct: false,
        explain: 'That is the shape of B @ A. * never sums over a shared dimension.',
      },
    ],
  },
  {
    id: 'cost',
    type: 'numeric',
    prompt: 'How many multiply-adds does the triple loop perform for a (2, 3) matrix times a (3, 4) matrix?',
    answer: 24,
    tolerance: 0,
    hint: 'The result has 2 · 4 entries, and each one is a sum of 3 products.',
    explain:
      'm · n · p = 2 · 3 · 4 = 24. The same count, 2mnp floating-point operations, is how ML engineers estimate the cost of a layer.',
  },
  {
    id: 'steps',
    type: 'order',
    prompt: 'Put the steps for computing one entry C[i][j] in order.',
    items: [
      'Check that the column count of A equals the row count of B',
      'Take row i of A and column j of B',
      'Multiply the numbers in matching positions',
      'Add up the products',
    ],
    explain: 'Check the shapes first, then pair up, multiply and sum: one dot product per entry.',
  },
];

export const matmulExercise: Exercise = {
  id: 'matmul-function',
  prompt:
    'Write `matmul(A, B)` for matrices given as lists of rows, without NumPy. Raise `ValueError` when the column count of A differs from the row count of B.',
  starter: `def matmul(A, B):
    # Check the shapes, then fill a result with len(A) rows and len(B[0]) columns.
    pass`,
  hints: [
    'Shapes first: if `len(A[0]) != len(B)`, `raise ValueError(...)` with both shapes in the message.',
    'Build the result with `[[0] * len(B[0]) for _ in range(len(A))]`, then use three loops: i over rows of A, j over columns of B, k over the shared size.',
    'Inside the innermost loop: `C[i][j] += A[i][k] * B[k][j]`.',
  ],
  solution: `def matmul(A, B):
    if len(A[0]) != len(B):
        raise ValueError(f"can't multiply {len(A)}x{len(A[0])} by {len(B)}x{len(B[0])}")
    C = [[0] * len(B[0]) for _ in range(len(A))]
    for i in range(len(A)):
        for j in range(len(B[0])):
            for k in range(len(B)):
                C[i][j] += A[i][k] * B[k][j]
    return C`,
  explanation:
    'The shape check runs before any arithmetic, so a mismatch fails with a clear message instead of an IndexError deep in the loop. Each entry C[i][j] is the dot product of row i of A and column j of B, built up one product at a time.',
  tests: `assert matmul([[1, 2, 3], [4, 5, 6]], [[7, 8], [9, 10], [11, 12]]) == [[58, 64], [139, 154]], 'the lesson example should give [[58, 64], [139, 154]]'
assert matmul([[2]], [[3]]) == [[6]], '1x1 times 1x1 should give [[6]]'
assert matmul([[1, 2]], [[3], [4]]) == [[11]], 'a row times a column is their dot product: [[11]]'
assert matmul([[1], [2]], [[3, 4]]) == [[3, 4], [6, 8]], 'a column times a row gives a 2x2 matrix'
try:
    matmul([[1, 2, 3]], [[1, 2, 3]])
    raised = False
except ValueError:
    raised = True
assert raised, 'matmul should raise ValueError when A has 3 columns but B has 1 row'`,
};
