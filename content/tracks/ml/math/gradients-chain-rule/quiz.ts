import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'partial',
    type: 'numeric',
    prompt: 'f(w, b) = 3w² + wb. What is ∂f/∂w at w = 1, b = 4?',
    answer: 10,
    tolerance: 0,
    hint: 'Treat b as a constant: ∂f/∂w = 6w + b.',
    explain: '6 · 1 + 4 = 10. (∂f/∂b would be w = 1.)',
  },
  {
    id: 'direction',
    type: 'choice',
    prompt: 'The gradient of a loss at the current weights is (∂L/∂w₁, ∂L/∂w₂) = (4, −2). Which change lowers the loss fastest?',
    options: [
      {
        text: 'Move the weights in the direction (−4, 2)',
        correct: true,
        explain: 'The gradient points uphill; its negative points steepest downhill.',
      },
      {
        text: 'Move the weights in the direction (4, −2)',
        correct: false,
        explain: 'That is the direction of steepest increase.',
      },
      {
        text: 'Increase both weights',
        correct: false,
        explain: '∂L/∂w₁ = 4 > 0 means increasing w₁ raises the loss.',
      },
    ],
  },
  {
    id: 'chain',
    type: 'numeric',
    prompt: 'L = (w·x + b − y)² with w = 2, x = 3, b = 1, y = 4. What is ∂L/∂w?',
    answer: 18,
    tolerance: 0,
    hint: 'First e = w·x + b − y. Then ∂L/∂w = 2e · x.',
    explain: 'e = 2·3 + 1 − 4 = 3, so ∂L/∂e = 2e = 6 and ∂L/∂w = 6 · x = 6 · 3 = 18.',
  },
  {
    id: 'reuse',
    type: 'choice',
    prompt: 'Why does the backward pass go from the loss back toward the inputs?',
    options: [
      {
        text: 'Each node’s gradient is the next node’s gradient times one local derivative, so going backward reuses work',
        correct: true,
        explain: 'Starting from ∂L/∂L = 1, every gradient is one multiplication away from one already computed. This is backpropagation.',
      },
      {
        text: 'Because the forward values are not needed',
        correct: false,
        explain: 'They are needed: local derivatives such as 2e and x use the forward values.',
      },
      {
        text: 'It is a convention; going forward gives the same cost',
        correct: false,
        explain: 'With one loss and many weights, the backward order computes all the gradients in one pass; going forward would need a pass per weight.',
      },
    ],
  },
];

export const gradientExercise: Exercise = {
  id: 'linear-gradient',
  prompt:
    'Write `gradient(w, b, x, y)` that returns `(dL_dw, dL_db)` for L = (w·x + b − y)², using the chain rule.',
  starter: `def gradient(w, b, x, y):
    # forward: e = w * x + b - y
    # backward: dL/de = 2e, then multiply by each local derivative
    pass`,
  hints: [
    'Compute the error first: `e = w * x + b - y`.',
    '∂L/∂e is `2 * e`. The local derivative of e with respect to b is 1, and with respect to w it is x.',
    'Return `(2 * e * x, 2 * e)`.',
  ],
  solution: `def gradient(w, b, x, y):
    e = w * x + b - y
    dL_de = 2 * e
    return dL_de * x, dL_de * 1`,
  explanation:
    'The forward pass computes e; the backward pass starts from ∂L/∂e = 2e and multiplies it by the local derivative of e with respect to each parameter: x for w and 1 for b.',
  tests: `assert gradient(1, 0, 2, 6) == (-16, -8), 'the lesson example: w=1, b=0, x=2, y=6 gives (-16, -8)'
assert gradient(2, 1, 3, 4) == (18, 6), 'w=2, b=1, x=3, y=4: e = 3, so (18, 6)'
assert gradient(1, 1, 5, 6) == (0, 0), 'a perfect prediction has zero gradient'
dw, db = gradient(0.5, -1.0, 4.0, 2.0)
assert abs(dw - (-8.0)) < 1e-12 and abs(db - (-2.0)) < 1e-12, 'w=0.5, b=-1, x=4, y=2 gives (-8, -2)'`,
};
