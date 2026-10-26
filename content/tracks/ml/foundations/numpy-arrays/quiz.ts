import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'column-shape',
    type: 'choice',
    prompt: '`a` has shape `(4, 3)`. What is the shape of `a[:, 1]`?',
    options: [
      {
        text: '(4,)',
        correct: true,
        explain:
          'The : keeps all 4 rows; the plain 1 picks one column and removes axis 1. What is left is a 1-D array of 4 numbers.',
      },
      {
        text: '(4, 1)',
        correct: false,
        explain: 'A plain number removes its axis. a[:, 1:2] would keep it and give (4, 1).',
      },
      {
        text: '(3,)',
        correct: false,
        explain: 'That is the shape of a row, a[1]. A column has one number per row, and there are 4 rows.',
      },
    ],
  },
  {
    id: 'reshape-error',
    type: 'choice',
    prompt: 'What happens with `np.arange(12).reshape(5, 2)`?',
    options: [
      {
        text: 'ValueError: cannot reshape array of size 12 into shape (5,2)',
        correct: true,
        explain:
          'A shape of (5, 2) holds 10 numbers. Reshape never adds or drops numbers, so the sizes must match.',
      },
      {
        text: 'It returns the first 10 numbers in 5 rows',
        correct: false,
        explain: 'NumPy never drops data silently in reshape; it raises an error instead.',
      },
      {
        text: 'It pads the array with zeros',
        correct: false,
        explain:
          'Reshape keeps the same numbers. np.resize is the (rarely used) function that repeats values to fit.',
      },
    ],
  },
  {
    id: 'row-values',
    type: 'choice',
    prompt: '`m = np.arange(12).reshape(3, 4)`. What does `print(m[2])` print?',
    options: [
      {
        text: '[ 8  9 10 11]',
        correct: true,
        explain: 'Rows are filled in order: row 0 is 0 to 3, row 1 is 4 to 7, row 2 is 8 to 11.',
      },
      {
        text: '[ 2  6 10]',
        correct: false,
        explain: 'That is column 2, m[:, 2]. One index picks along axis 0, the rows.',
      },
      {
        text: '2',
        correct: false,
        explain: 'm[2] is a whole row. The single number 2 is at m[0, 2].',
      },
    ],
  },
  {
    id: 'size',
    type: 'numeric',
    prompt: 'A batch of images has shape `(32, 3, 28, 28)`. How many numbers does it hold (its `.size`)?',
    answer: 75264,
    tolerance: 0,
    hint: 'Multiply the sizes of all axes.',
    explain: '32 × 3 × 28 × 28 = 75,264. The size of an array is the product of its shape.',
  },
  {
    id: 'dtype',
    type: 'choice',
    prompt:
      'Why can a NumPy array add a number to every element so much faster than a Python loop over a list?',
    options: [
      {
        text: 'All elements share one dtype and sit side by side in memory, so one compiled loop processes them',
        correct: true,
        explain:
          "The loop runs inside NumPy's compiled code instead of the Python interpreter, which would check each item's type every time.",
      },
      {
        text: 'NumPy uses the graphics card',
        correct: false,
        explain: 'NumPy runs on the CPU. Libraries such as PyTorch and CuPy are the ones that use GPUs.',
      },
      {
        text: 'Arrays skip some of the numbers',
        correct: false,
        explain: 'Every element is processed. The saving is in how each one is processed.',
      },
    ],
  },
];

export const splitExercise: Exercise = {
  id: 'split-xy',
  prompt:
    'Write `split_xy(data)`: `data` is a 2-D array with one row per example. Return `X`, every column except the last, and `y`, the last column.',
  starter: `import numpy as np

def split_xy(data):
    X = data
    y = data
    return X, y`,
  hints: [
    'Keep every row with `:` before the comma.',
    'Columns "all but the last" is the slice `:-1`; the last column is the index `-1`.',
    '`X = data[:, :-1]` and `y = data[:, -1]`.',
  ],
  solution: `import numpy as np

def split_xy(data):
    X = data[:, :-1]
    y = data[:, -1]
    return X, y`,
  explanation:
    'This is how tabular data is usually split into features X (shape (n, d)) and labels y (shape (n,)) before training a model.',
  tests: `import numpy as np
data = np.array([[5.1, 3.5, 0], [4.9, 3.0, 0], [6.3, 3.3, 1]])
X, y = split_xy(data)
assert X.shape == (3, 2), f"X should have shape (3, 2), got {X.shape}"
assert y.shape == (3,), f"y should have shape (3,), got {y.shape}"
assert np.array_equal(y, [0, 0, 1]), f"y should be the last column, got {y}"
assert np.array_equal(X[2], [6.3, 3.3]), f"X[2] should be [6.3 3.3], got {X[2]}"
X2, y2 = split_xy(np.arange(12).reshape(3, 4))
assert X2.shape == (3, 3) and np.array_equal(y2, [3, 7, 11]), "should work for any number of columns"`,
};
