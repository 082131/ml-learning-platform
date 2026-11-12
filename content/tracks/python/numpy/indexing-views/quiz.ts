import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'view-slice',
    type: 'choice',
    prompt: '`a = np.zeros(5)`, `b = a[1:3]`, `b[0] = 7`. What is `a`?',
    options: [
      {
        text: '[0. 0. 0. 0. 0.]',
        correct: false,
        explain: 'A basic slice is a view, so the write goes into a’s memory.',
      },
      {
        text: '[0. 7. 0. 0. 0.]',
        correct: true,
        explain: 'b[0] is a[1]: the slice starts at position 1 of the same data.',
      },
      { text: '[7. 0. 0. 0. 0.]', correct: false, explain: 'b’s position 0 is a’s position 1, not 0.' },
    ],
  },
  {
    id: 'mask-copy',
    type: 'choice',
    prompt: '`a = np.arange(6)`, `b = a[a > 2]`, `b[:] = 0`. What is `a`?',
    options: [
      {
        text: '[0 1 2 0 0 0]',
        correct: false,
        explain: 'That is what a[a > 2] = 0 does: assignment through a mask on a itself.',
      },
      {
        text: '[0 1 2 3 4 5]',
        correct: true,
        explain: 'Indexing with a mask returns a copy, so writing into b leaves a alone.',
      },
      {
        text: '[0 0 0 3 4 5]',
        correct: false,
        explain: 'Nothing writes to the first three elements, and b is a separate array anyway.',
      },
    ],
  },
  {
    id: 'axis-shape',
    type: 'choice',
    prompt: '`X` has shape `(100, 8)`: 100 rows, 8 features. What is the shape of `X.mean(axis=0)`?',
    options: [
      {
        text: '(100,)',
        correct: false,
        explain: 'That is axis=1: one value per row, collapsing the 8 columns.',
      },
      {
        text: '(1, 8)',
        correct: false,
        explain: 'Only with keepdims=True, which keeps the collapsed axis as length 1.',
      },
      {
        text: '(8,)',
        correct: true,
        explain:
          'axis=0 is the axis that disappears: the 100 rows are averaged, leaving one mean per feature.',
      },
      {
        text: '()',
        correct: false,
        explain: 'That is X.mean() with no axis: one number for the whole array.',
      },
    ],
  },
  {
    id: 'keepdims',
    type: 'choice',
    prompt: 'Why does `X - X.mean(axis=1)` fail for `X` of shape `(100, 8)`, while `keepdims=True` fixes it?',
    options: [
      {
        text: 'Its (100,) result lines up against the 8 columns',
        correct: true,
        explain:
          '(100, 8) and (100,) align from the right: 8 vs 100 mismatch. keepdims gives (100, 1), which stretches across the 8 columns.',
      },
      {
        text: 'Float arrays can only be subtracted with keepdims set',
        correct: false,
        explain: 'Dtypes have nothing to do with it; it is purely about shapes.',
      },
      {
        text: 'mean returns a read-only copy that cannot broadcast',
        correct: false,
        explain: 'Copies and views both broadcast the same way.',
      },
    ],
  },
  {
    id: 'and-mask',
    type: 'choice',
    prompt: 'Which line keeps ages from 25 up to (not including) 50?',
    options: [
      {
        text: 'ages[ages >= 25 and ages < 50]',
        correct: false,
        explain: 'and asks for one True/False for the whole array: ValueError, truth value ambiguous.',
      },
      {
        text: 'ages[(ages >= 25) & (ages < 50)]',
        correct: true,
        explain: '& combines element by element; parentheses are needed because & binds tighter than >=.',
      },
      {
        text: 'ages[ages >= 25 & ages < 50]',
        correct: false,
        explain: 'Without parentheses Python reads 25 & ages first, which is not what you mean.',
      },
      {
        text: 'ages[25 <= ages < 50]',
        correct: false,
        explain: 'A chained comparison uses and internally, so it raises the same ValueError.',
      },
    ],
  },
];

export const standardizeExercise: Exercise = {
  id: 'py-views-standardize',
  prompt:
    'Write standardize(X) that returns a new array where every column has mean 0 and standard deviation 1.',
  starter: `import numpy as np

def standardize(X):
    X -= X.mean()          # bug 1: one mean for the whole array; bug 2: changes X in place
    return X / X.std()`,
  hints: [
    'Column statistics come from axis=0.',
    'X - mean builds a new array; X -= mean writes into the caller’s array.',
    'Shapes: X is (n, d) and X.mean(axis=0) is (d,), which broadcasts across rows.',
  ],
  solution: `import numpy as np

def standardize(X):
    return (X - X.mean(axis=0)) / X.std(axis=0)`,
  explanation:
    'axis=0 gives one mean and one standard deviation per feature, and (n, d) − (d,) broadcasts them across every row. Because the expression builds new arrays, the input stays untouched.',
  tests: `import numpy as np
X = np.array([[1., 10.], [3., 30.], [5., 50.]])
Z = standardize(X)
assert np.allclose(Z.mean(axis=0), 0), Z.mean(axis=0)
assert np.allclose(Z.std(axis=0), 1), Z.std(axis=0)
assert np.allclose(Z[:, 0], Z[:, 1]), "each column must be scaled by its own std"
assert X[0, 0] == 1.0, "standardize must not change its input"`,
};
