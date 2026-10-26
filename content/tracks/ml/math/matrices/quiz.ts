import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'shape',
    type: 'choice',
    prompt: 'A dataset has 500 examples and 12 features, one example per row. What is its shape?',
    options: [
      {
        text: '(500, 12)',
        correct: true,
        explain: 'Rows come first: 500 rows (examples), 12 columns (features).',
      },
      {
        text: '(12, 500)',
        correct: false,
        explain: 'That is the shape of its transpose, with one row per feature.',
      },
      {
        text: '(6000,)',
        correct: false,
        explain: '6000 is the number of entries, but a matrix keeps its two dimensions.',
      },
    ],
  },
  {
    id: 'entry',
    type: 'numeric',
    prompt: 'A = np.array([[1, 2, 3], [4, 5, 6]]). What is A[1, 0]?',
    answer: 4,
    tolerance: 0,
    hint: 'Row 1 is the second row, [4, 5, 6]. Column 0 is its first entry.',
    explain: 'Row index first, column index second, both from 0: row 1, column 0 is 4.',
  },
  {
    id: 'transpose-shape',
    type: 'choice',
    prompt: 'M has shape (3, 5). Which of these is defined?',
    options: [
      {
        text: 'M + M',
        correct: true,
        explain: 'Both have shape (3, 5), so the entries pair up.',
      },
      {
        text: 'M + M.T',
        correct: false,
        explain:
          'M.T has shape (5, 3). Element-wise addition needs equal shapes, so NumPy raises a broadcasting ValueError.',
      },
      {
        text: 'M[3, 0]',
        correct: false,
        explain:
          'Rows are numbered 0, 1, 2. Index 3 raises IndexError: index 3 is out of bounds for axis 0 with size 3.',
      },
    ],
  },
  {
    id: 'transpose-entry',
    type: 'choice',
    prompt: 'After T = A.T, where does A[0, 2] end up?',
    options: [
      { text: 'T[2, 0]', correct: true, explain: 'Transposing swaps the two indices.' },
      { text: 'T[0, 2]', correct: false, explain: 'Only entries on the diagonal (i = j) stay in place.' },
      {
        text: 'T[2, 2]',
        correct: false,
        explain: 'The row index becomes the column index and vice versa; neither is replaced.',
      },
    ],
  },
];

export const transposeExercise: Exercise = {
  id: 'transpose-function',
  prompt: 'Write `transpose(M)` for a matrix given as a list of rows, without NumPy or zip.',
  starter: `def transpose(M):
    # The result has one row per column of M.
    pass`,
  hints: [
    'The result has `len(M[0])` rows and `len(M)` columns.',
    'Row j of the result is column j of M: `[M[i][j] for i in range(len(M))]`.',
    'Wrap that in a comprehension over j: `[[M[i][j] for i in range(len(M))] for j in range(len(M[0]))]`.',
  ],
  solution: `def transpose(M):
    rows, cols = len(M), len(M[0])
    return [[M[i][j] for i in range(rows)] for j in range(cols)]`,
  explanation:
    'Entry [i][j] of M becomes entry [j][i] of the result, so the outer loop runs over the columns of M and the inner loop collects each column into a new row.',
  tests: `assert transpose([[1, 2, 3], [4, 5, 6]]) == [[1, 4], [2, 5], [3, 6]], 'a (2, 3) matrix should become (3, 2)'
assert transpose([[7]]) == [[7]], 'a 1x1 matrix is its own transpose'
assert transpose([[1, 2, 3]]) == [[1], [2], [3]], 'a row becomes a column'
M = [[1, 2], [3, 4]]
assert transpose(transpose(M)) == M, 'transposing twice gives the original back'
assert M == [[1, 2], [3, 4]], 'transpose should not change its input'`,
};
