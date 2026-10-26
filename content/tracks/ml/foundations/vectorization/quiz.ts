import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'row-plus-table',
    type: 'choice',
    prompt: '`X` has shape `(100, 3)` and `w` has shape `(3,)`. What is the shape of `X * w`?',
    options: [
      {
        text: '(100, 3)',
        correct: true,
        explain:
          'Lined up from the right, 3 matches 3, and w has no axis for the 100, so it is stretched down all 100 rows.',
      },
      {
        text: '(3,)',
        correct: false,
        explain:
          'Element-wise operations keep the larger shape. Summing would be needed to get back to (3,).',
      },
      {
        text: 'ValueError',
        correct: false,
        explain:
          'Shapes are compared from the right: (100, 3) and (3,) agree on the last axis, so they broadcast.',
      },
    ],
  },
  {
    id: 'column-mismatch',
    type: 'choice',
    prompt: '`X` has shape `(100, 3)` and `m` has shape `(100,)`. What does `X - m` do?',
    options: [
      {
        text: 'ValueError: operands could not be broadcast together with shapes (100,3) (100,)',
        correct: true,
        explain:
          'From the right, 3 is compared with 100. They differ and neither is 1. Use m.reshape(-1, 1), shape (100, 1), to subtract one number per row.',
      },
      {
        text: 'It subtracts m[i] from every number in row i',
        correct: false,
        explain:
          'That is what you might mean, but NumPy lines shapes up from the right, not the left. You need shape (100, 1) for that.',
      },
      {
        text: 'It returns shape (100, 100)',
        correct: false,
        explain: 'That would need shapes (100, 1) and (100,). Here the last axes, 3 and 100, do not match.',
      },
    ],
  },
  {
    id: 'outer',
    type: 'choice',
    prompt: 'What is the shape of `np.zeros((5, 1)) + np.zeros((1, 6))`?',
    options: [
      {
        text: '(5, 6)',
        correct: true,
        explain:
          'Each axis has a 1 on one side, so both are stretched: every one of 5 rows meets every one of 6 columns.',
      },
      {
        text: '(5, 1)',
        correct: false,
        explain: 'Size-1 axes are stretched to the other operand’s size, so axis 1 becomes 6.',
      },
      {
        text: 'ValueError',
        correct: false,
        explain:
          'A size of 1 is always compatible. Only two different sizes, neither of them 1, give an error.',
      },
    ],
  },
  {
    id: 'mean-axis',
    type: 'choice',
    prompt: '`X` has shape `(100, 3)`: 100 examples, 3 features. Which gives the average of each feature?',
    options: [
      {
        text: 'X.mean(axis=0), shape (3,)',
        correct: true,
        explain:
          'axis=0 averages down the rows, collapsing the 100 examples and leaving one number per feature.',
      },
      {
        text: 'X.mean(axis=1), shape (100,)',
        correct: false,
        explain: 'axis=1 averages across each row: one number per example, mixing different features.',
      },
      {
        text: 'X.mean(), one number',
        correct: false,
        explain: 'Without axis, NumPy averages all 300 numbers together.',
      },
    ],
  },
  {
    id: 'mask',
    type: 'choice',
    prompt: '`P = np.array([3.0, 12.5, 7.25, 20.0])`. What does `print(P[P > 10])` print?',
    options: [
      {
        text: '[12.5 20. ]',
        correct: true,
        explain: 'P > 10 is [False True False True]; indexing with it keeps the elements where it is True.',
      },
      {
        text: '[False  True False  True]',
        correct: false,
        explain: 'That is P > 10 itself, the mask. Indexing P with the mask selects the values.',
      },
      {
        text: '2',
        correct: false,
        explain: 'That is how many values pass, (P > 10).sum(): True counts as 1.',
      },
    ],
  },
];

export const standardizeExercise: Exercise = {
  id: 'standardize',
  prompt:
    'Write `standardize(X)` without a loop: subtract each column’s mean and divide by each column’s standard deviation.',
  starter: `import numpy as np

def standardize(X):
    # X has one row per example and one column per feature.
    return X`,
  hints: [
    '`X.mean(axis=0)` has one mean per column, shape `(d,)`.',
    'Shape `(n, d)` minus shape `(d,)` broadcasts the means down every row.',
    '`return (X - X.mean(axis=0)) / X.std(axis=0)`',
  ],
  solution: `import numpy as np

def standardize(X):
    return (X - X.mean(axis=0)) / X.std(axis=0)`,
  explanation:
    'Standardizing puts every feature on the same scale (mean 0, standard deviation 1), which many models need. Broadcasting does it for any number of rows and columns in one line.',
  tests: `import numpy as np
X = np.array([[1.0, 200.0], [2.0, 300.0], [3.0, 400.0]])
Z = standardize(X)
assert Z.shape == X.shape, f"the result should keep shape {X.shape}, got {Z.shape}"
assert np.allclose(Z.mean(axis=0), 0), f"each column should have mean 0, got {Z.mean(axis=0)}"
assert np.allclose(Z.std(axis=0), 1), f"each column should have standard deviation 1, got {Z.std(axis=0)}"
assert np.allclose(Z[0], [-1.2247449, -1.2247449]), f"Z[0] should be about [-1.2247 -1.2247], got {Z[0]}"
R = np.arange(12.0).reshape(4, 3) ** 2
assert np.allclose(standardize(R).std(axis=0), 1), "should work for any number of columns"`,
};
