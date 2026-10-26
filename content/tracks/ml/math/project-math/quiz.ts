import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'loop-count',
    type: 'numeric',
    prompt:
      'A triple-loop matmul multiplies a (3, 4) matrix by a (4, 2) matrix. How many multiplications does it do?',
    answer: 24,
    tolerance: 0,
    hint: 'There are 3 × 2 output entries, and each is a dot product of length 4.',
    explain: '3 · 2 · 4 = 24. In general (n, k) @ (k, m) costs n · k · m multiplications.',
  },
  {
    id: 'compare-floats',
    type: 'choice',
    prompt:
      'Your gradient descent returns w = 1.7999999999999996 and np.polyfit gives 1.8. How should a test compare them?',
    options: [
      {
        text: 'Check that they agree within a small tolerance, such as abs(w - 1.8) < 1e-6',
        correct: true,
        explain:
          'Iterative methods and floating point leave tiny differences. A tolerance tests what matters: that the answer is right.',
      },
      {
        text: 'Check w == 1.8',
        correct: false,
        explain: 'That fails here even though the answer is correct to 15 digits.',
      },
      {
        text: 'Round both to 0 decimal places first',
        correct: false,
        explain: 'Far too loose: it would accept w = 2.3.',
      },
    ],
  },
];

export const matmulProjectExercise: Exercise = {
  id: 'project-matmul',
  prompt:
    'Milestone 1. Write `matmul(A, B)` for lists of rows, without NumPy. Raise `ValueError` when the shapes do not fit. The tests compare it with results computed by NumPy.',
  starter: `def matmul(A, B):
    pass`,
  hints: [
    'Check `len(A[0]) != len(B)` first and raise `ValueError` with both shapes in the message.',
    'The result has `len(A)` rows and `len(B[0])` columns. Entry (i, j) is the dot product of row i of A and column j of B.',
    'Three loops: i over rows of A, j over columns of B, k over the shared size. Inside: `C[i][j] += A[i][k] * B[k][j]`.',
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
    'The expected values in the tests were computed with NumPy’s @ operator. Integer and these float products are exact, so they match NumPy entry for entry.',
  tests: `# Expected values computed with NumPy 2.5.3: (np.array(A) @ np.array(B)).tolist()
A = [[1, -3, 4, 5], [-5, 3, 4, 2], [3, -2, -1, 2]]
B = [[-4, -4], [-2, 4], [-1, -4], [4, 3]]
assert matmul(A, B) == [[18, -17], [18, 22], [1, -10]], 'a (3, 4) @ (4, 2) product should match NumPy'
A = [[1.5, -2.0], [0.25, 4.0], [3.0, 0.5]]
B = [[2.0, 1.0, -1.0], [0.5, -3.0, 2.0]]
assert matmul(A, B) == [[2.0, 7.5, -5.5], [2.5, -11.75, 7.75], [6.25, 1.5, -2.0]], 'a float (3, 2) @ (2, 3) product should match NumPy'
I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
assert matmul([[2, -1, 3]], I) == [[2, -1, 3]], 'multiplying by the identity changes nothing'
try:
    matmul([[1, 2]], [[1, 2]])
    raise AssertionError('a (1, 2) @ (1, 2) product should raise ValueError')
except ValueError:
    pass`,
};

export const fitLineExercise: Exercise = {
  id: 'project-fit-line',
  prompt:
    'Milestone 2. Write `fit_line(xs, ys, lr, steps, w=0.0, b=0.0)` that fits ŷ = w·x + b by gradient descent on the mean squared error and returns `(w, b)`.',
  starter: `def fit_line(xs, ys, lr, steps, w=0.0, b=0.0):
    n = len(xs)
    for _ in range(steps):
        # 1. the error of each prediction
        # 2. dw and db: the partial derivatives of the mean squared error
        # 3. update w and b together
        pass
    return w, b`,
  hints: [
    '`errs = [w * x + b - y for x, y in zip(xs, ys)]`.',
    '`dw = 2 * sum(e * x for e, x in zip(errs, xs)) / n` and `db = 2 * sum(errs) / n`.',
    'Update both from the old values in one line: `w, b = w - lr * dw, b - lr * db`.',
  ],
  solution: `def fit_line(xs, ys, lr, steps, w=0.0, b=0.0):
    n = len(xs)
    for _ in range(steps):
        errs = [w * x + b - y for x, y in zip(xs, ys)]
        dw = 2 * sum(e * x for e, x in zip(errs, xs)) / n
        db = 2 * sum(errs) / n
        w, b = w - lr * dw, b - lr * db
    return w, b`,
  explanation:
    'This is the loss and optimization lesson’s code as a function. With enough steps it reaches the same line as np.polyfit, the least-squares solution computed directly.',
  tests: `w, b = fit_line([0, 1, 2, 3], [1, 2, 5, 6], 0.1, 30, w=-1.0, b=5.0)
assert abs(w - 1.4637524475687191) < 1e-9 and abs(b - 1.5179025165928706) < 1e-9, 'from (-1, 5), 30 steps of lr 0.1 should reach the lesson result (1.4638, 1.5179)'
w, b = fit_line([0, 1, 2, 3], [1, 2, 5, 6], 0.1, 2000)
assert abs(w - 1.8) < 1e-6 and abs(b - 0.8) < 1e-6, 'after 2000 steps it should match np.polyfit: w = 1.8, b = 0.8'
w, b = fit_line([1, 2, 3, 4, 5], [2.2, 4.1, 6.3, 7.9, 10.1], 0.02, 5000)
assert abs(w - 1.96) < 1e-6 and abs(b - 0.24) < 1e-6, 'on five points it should match np.polyfit: w = 1.96, b = 0.24'
assert fit_line([0, 1], [1, 3], 0.1, 0) == (0.0, 0.0), 'zero steps return the starting point'`,
};
