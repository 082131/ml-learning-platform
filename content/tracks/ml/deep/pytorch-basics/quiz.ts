import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'linear-shape',
    type: 'choice',
    prompt: 'What is the shape of nn.Linear(784, 128).weight?',
    options: [
      {
        text: '(128, 784)',
        correct: true,
        explain: 'nn.Linear stores weight as (out_features, in_features) and computes x @ weight.T + bias.',
      },
      {
        text: '(784, 128)',
        correct: false,
        explain: 'That is the (in, out) layout of X @ W in the NumPy lessons. PyTorch stores the transpose.',
      },
      {
        text: '(128,)',
        correct: false,
        explain: 'That is the shape of the bias: one number per output.',
      },
    ],
  },
  {
    id: 'param-count',
    type: 'numeric',
    prompt: 'How many parameters does TinyNet (nn.Linear(2, 3) then nn.Linear(3, 1)) have?',
    answer: 13,
    tolerance: 0,
    hint: 'Each Linear has in·out weights plus out biases.',
    explain:
      '2·3 + 3 = 9 for the hidden layer and 3·1 + 1 = 4 for the output layer: 13. sum(p.numel() for p in model.parameters()) gives the same.',
  },
  {
    id: 'zero-grad',
    type: 'choice',
    prompt: 'What goes wrong if you remove optimizer.zero_grad() from the loop?',
    options: [
      {
        text: 'backward() adds each new gradient to the old ones, so steps use a growing sum of past gradients',
        correct: true,
        explain:
          'PyTorch accumulates into .grad on purpose (it allows gradient accumulation over several batches), so you must clear it each step.',
      },
      {
        text: 'backward() raises an error the second time',
        correct: false,
        explain: 'It runs without an error; that is what makes this bug easy to miss.',
      },
      {
        text: 'Nothing: step() clears the gradients',
        correct: false,
        explain: 'step() only reads .grad. Clearing is zero_grad()’s job.',
      },
    ],
  },
  {
    id: 'no-grad',
    type: 'choice',
    prompt: 'Why is evaluation usually wrapped in `with torch.no_grad():`?',
    options: [
      {
        text: 'Autograd records nothing inside it, which saves memory and time when no backward pass will follow',
        correct: true,
        explain: 'Outside no_grad every operation on tensors that require grad is recorded for backward().',
      },
      {
        text: 'It freezes the weights so that step() cannot change them',
        correct: false,
        explain: 'It does not affect the optimizer; it only stops recording operations.',
      },
      {
        text: 'It makes model(X) return a NumPy array',
        correct: false,
        explain: 'The result is still a tensor, just without a gradient history.',
      },
    ],
  },
  {
    id: 'loop-order',
    type: 'order',
    prompt: 'Put one PyTorch training step in order.',
    items: [
      'optimizer.zero_grad()',
      'y_hat = model(X)',
      'loss = loss_fn(y_hat, y)',
      'loss.backward()',
      'optimizer.step()',
    ],
    explain:
      'Clear old gradients, forward, loss, backward to fill .grad, then update. zero_grad can also come right after step; it must not sit between backward and step.',
  },
];

export const transposeExercise: Exercise = {
  id: 'linear-forward',
  prompt:
    'Write `linear(x, weight, bias)` in plain Python that computes what nn.Linear does for one input row: x @ weight.T + bias, with weight given as a list of rows of shape (out, in).',
  starter: `def linear(x, weight, bias):
    # weight has one row per output; output j = sum_k x[k] * weight[j][k] + bias[j]
    pass`,
  hints: [
    'There is one output per row of weight.',
    'Output j is the dot product of x with weight[j], plus bias[j]: `sum(a * b for a, b in zip(x, weight[j])) + bias[j]`.',
  ],
  solution: `def linear(x, weight, bias):
    return [sum(a * w for a, w in zip(x, row)) + b for row, b in zip(weight, bias)]`,
  explanation:
    'Because weight is stored as (out, in), each output uses one row of weight. That is the same as multiplying by the transpose: x @ weight.T. For the lesson’s hidden layer and x = (0, 1): [0·0.5 + 1·(−0.3) + 0.1, 0·0.8 + 1·0.2 − 0.1, 0·(−0.4) + 1·0.6 + 0] = [−0.2, 0.1, 0.6].',
  tests: `out = linear([0.0, 1.0], [[0.5, -0.3], [0.8, 0.2], [-0.4, 0.6]], [0.1, -0.1, 0.0])
assert len(out) == 3, f'nn.Linear(2, 3) gives 3 outputs, got {len(out)}'
assert all(abs(a - b) < 1e-9 for a, b in zip(out, [-0.2, 0.1, 0.6])), f'expected [-0.2, 0.1, 0.6], got {out}'
assert linear([2.0, 3.0], [[1.0, 1.0]], [0.5]) == [5.5], 'one output: 2 + 3 + 0.5 = 5.5'
assert linear([1.0], [[2.0], [3.0]], [0.0, 1.0]) == [2.0, 4.0], 'two outputs from one input'`,
};
