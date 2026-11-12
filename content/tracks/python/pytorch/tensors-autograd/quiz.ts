import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'bcast',
    type: 'choice',
    prompt:
      '`x` has shape `(2, 3)`. Which tensor can multiply it element-wise to scale each **row** by its own factor?',
    options: [
      {
        text: 'torch.tensor([1.0, 10.0]), shape (2,)',
        correct: false,
        explain:
          'Shapes align from the right: 2 is compared with 3, so this raises a size-mismatch RuntimeError.',
      },
      {
        text: 'torch.tensor([[1.0], [10.0]]), shape (2, 1)',
        correct: true,
        explain: '(2, 1) stretches across the 3 columns, so row 0 is multiplied by 1 and row 1 by 10.',
      },
      {
        text: 'torch.tensor([1.0, 10.0, 100.0]), shape (3,)',
        correct: false,
        explain: 'That scales each column, not each row.',
      },
    ],
  },
  {
    id: 'view',
    type: 'choice',
    prompt: 'Why does `x.T.view(6)` fail while `x.T.reshape(6)` works?',
    options: [
      {
        text: 'view only works on tensors that have exactly one dimension',
        correct: false,
        explain: 'x.view(3, 2) works fine on a 2-D tensor.',
      },
      {
        text: 'The transpose is not contiguous, and view never copies',
        correct: true,
        explain:
          'A transpose only changes strides. view needs memory it can reinterpret as is; reshape copies when it must.',
      },
      {
        text: 'reshape and view take different argument types',
        correct: false,
        explain: 'Both accept the same shape arguments.',
      },
      {
        text: 'Transposed tensors cannot change shape',
        correct: false,
        explain: 'They can; reshape does it by copying.',
      },
    ],
  },
  {
    id: 'grad-value',
    type: 'numeric',
    prompt:
      'For `loss = (w * x + b - y) ** 2` with w = 2, x = 3, b = 0.5, y = 10, what is `w.grad` after one `loss.backward()`?',
    answer: -21,
    tolerance: 0,
    hint: 'dL/dw = 2 · (w·x + b − y) · x.',
    explain: 'pred − y = 6.5 − 10 = −3.5, so dL/dw = 2 × (−3.5) × 3 = −21.',
  },
  {
    id: 'accumulate',
    type: 'choice',
    prompt: 'A training loop forgets `optimizer.zero_grad()`. What happens?',
    options: [
      {
        text: 'PyTorch raises an error on the second backward',
        correct: false,
        explain:
          'Nothing stops you; accumulation is a feature (used for gradient accumulation over micro-batches).',
      },
      {
        text: 'Each step uses the sum of all gradients so far',
        correct: true,
        explain:
          'backward adds into .grad, so steps grow and point in a stale direction; training usually diverges or stalls.',
      },
      {
        text: 'The gradients are reset automatically by step()',
        correct: false,
        explain: 'step() only reads .grad; it never clears it.',
      },
    ],
  },
  {
    id: 'from-numpy',
    type: 'choice',
    prompt: 'After `t = torch.from_numpy(arr)` you change `arr[0, 0]`. What about `t[0, 0]`?',
    options: [
      {
        text: 'It keeps the old value; t is a copy',
        correct: false,
        explain: 'from_numpy shares memory; torch.tensor(arr) would copy.',
      },
      {
        text: 'It shows the new value',
        correct: true,
        explain: 'Both objects use the same buffer, as the recorded run shows (100.0).',
      },
      {
        text: 'PyTorch raises an error because arr changed',
        correct: false,
        explain: 'There is no change tracking between the two; they simply share memory.',
      },
    ],
  },
];

export const gradExercise: Exercise = {
  id: 'py-torch-manual-grad',
  prompt:
    'Write grads(w, b, x, y) returning (dL/dw, dL/db) for L = mean((w·x + b − y)²) on NumPy arrays: what autograd would compute.',
  starter: `import numpy as np

def grads(w, b, x, y):
    err = w * x + b - y
    return np.mean(err * x), np.mean(err)     # missing a factor`,
  hints: [
    'The derivative of err² is 2·err times the derivative of err.',
    'd err / dw = x and d err / db = 1.',
    'Average over the examples because L is a mean.',
  ],
  solution: `import numpy as np

def grads(w, b, x, y):
    err = w * x + b - y
    return np.mean(2 * err * x), np.mean(2 * err)`,
  explanation:
    'This is exactly what loss.backward() computes for a linear model with mean squared error. The tests check it against finite differences, the same check gradcheck uses.',
  tests: `import numpy as np
x = np.array([1.0, 2.0, 3.0]); y = np.array([2.0, 4.5, 5.0])
def L(w, b): return np.mean((w * x + b - y) ** 2)
gw, gb = grads(0.7, -0.2, x, y)
h = 1e-6
assert abs(gw - (L(0.7 + h, -0.2) - L(0.7 - h, -0.2)) / (2 * h)) < 1e-5, gw
assert abs(gb - (L(0.7, -0.2 + h) - L(0.7, -0.2 - h)) / (2 * h)) < 1e-5, gb`,
};
