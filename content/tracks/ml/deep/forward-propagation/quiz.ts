import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'shape-z1',
    type: 'choice',
    prompt:
      'A batch X has shape (32, 784) and the first layer has 128 units. What are the shapes of W1 and Z1 = X @ W1 + b1?',
    options: [
      {
        text: 'W1: (784, 128), Z1: (32, 128)',
        correct: true,
        explain:
          'W is (in, out). (32, 784) @ (784, 128): the inner 784s match and the result keeps the batch rows.',
      },
      {
        text: 'W1: (128, 784), Z1: (32, 128)',
        correct: false,
        explain:
          'That is PyTorch’s storage layout for nn.Linear, which computes X @ W.T. With X @ W1 the inner sizes would be 784 and 128, which do not match.',
      },
      {
        text: 'W1: (32, 128), Z1: (784, 128)',
        correct: false,
        explain: 'The weights do not depend on the batch size: the same W1 is used for 1 example or 1,000.',
      },
    ],
  },
  {
    id: 'params',
    type: 'numeric',
    prompt: 'How many weights and biases does the lesson’s 2-3-1 network have in total?',
    answer: 13,
    tolerance: 0,
    hint: 'Count W1 (2·3), b1 (3), W2 (3·1) and b2 (1).',
    explain: '2·3 + 3 + 3·1 + 1 = 6 + 3 + 3 + 1 = 13.',
  },
  {
    id: 'unit-by-hand',
    type: 'numeric',
    prompt:
      'With the lesson’s starting weights, example row 2 is X[2] = [1, 0]. What is Z1[2][2] = X[2][0]·W1[0][2] + X[2][1]·W1[1][2] + b1[2]? (W1[:, 2] = [1, -1], b1[2] = 0)',
    answer: 1,
    tolerance: 0,
    hint: 'Multiply 1 by W1[0][2] and 0 by W1[1][2], then add the bias.',
    explain: '1·1 + 0·(-1) + 0 = 1, so A1[2][2] = tanh(1) = 0.7616.',
  },
  {
    id: 'batch-weights',
    type: 'choice',
    prompt: 'You double the batch size from 4 to 8. What changes?',
    options: [
      {
        text: 'X, Z1, A1, Z2 and A2 get 8 rows; W1, b1, W2 and b2 stay the same',
        correct: true,
        explain:
          'The batch dimension is the first axis of every activation. Parameters are shared by all examples.',
      },
      {
        text: 'W1 gets 8 rows',
        correct: false,
        explain: 'W1’s rows match the number of input features (2), not the number of examples.',
      },
      {
        text: 'Each example’s prediction changes',
        correct: false,
        explain:
          'In this forward pass every row is computed independently, so one example’s output does not depend on the others in the batch.',
      },
    ],
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the steps of the forward pass in order.',
    items: ['Z1 = X @ W1 + b1', 'A1 = f(Z1)', 'Z2 = A1 @ W2 + b2', 'A2 = σ(Z2)'],
    explain:
      'Each layer computes its weighted sums, then its activation; the output of one layer is the input of the next.',
  },
];

export const denseExercise: Exercise = {
  id: 'dense-function',
  prompt:
    'Write `dense(X, W, b)` in plain Python. X is a list of rows (batch, in), W is (in, out) and b has length out. Return Z = X @ W + b as a list of rows (batch, out).',
  starter: `def dense(X, W, b):
    # One output row per input row; one value per column of W
    pass`,
  hints: [
    'The result has `len(X)` rows and `len(b)` columns.',
    'Entry [e][j] is `sum(X[e][k] * W[k][j] for k in range(len(W))) + b[j]`.',
    'Build each row with a list comprehension over j, inside a loop over the rows of X.',
  ],
  solution: `def dense(X, W, b):
    return [
        [sum(row[k] * W[k][j] for k in range(len(W))) + b[j] for j in range(len(b))]
        for row in X
    ]`,
  explanation:
    'Each output entry is one neuron’s weighted sum for one example: row e of X dotted with column j of W, plus bias j. The bias is the same for every row, which is what NumPy’s broadcasting does in X @ W + b.',
  tests: `assert dense([[1.0, 2.0]], [[1.0], [1.0]], [0.5]) == [[3.5]], 'one example, one unit: 1 + 2 + 0.5 = 3.5'
Z = dense([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]], [[2.0, 2.0, 1.0], [2.0, 2.0, -1.0]], [-1.0, -3.0, 0.0])
assert Z == [[-1.0, -3.0, 0.0], [1.0, -1.0, -1.0], [1.0, -1.0, 1.0], [3.0, 1.0, 0.0]], f'the lesson batch should give the lesson Z1, got {Z}'
assert len(dense([[1.0, 2.0]] * 5, [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]], [0.0] * 4)) == 5, 'the result needs one row per example'
assert len(dense([[1.0, 2.0]], [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]], [0.0] * 4)[0]) == 4, 'each row needs one value per column of W'`,
};
