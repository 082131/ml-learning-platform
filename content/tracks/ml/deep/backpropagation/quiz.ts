import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'dz2',
    type: 'numeric',
    prompt:
      'A sigmoid output has ŷ = 0.8, the target is y = 1, and the loss is (ŷ − y)². What is ∂L/∂z2 = 2(ŷ − y) · ŷ(1 − ŷ)? Give 3 decimals.',
    answer: -0.064,
    tolerance: 0.0005,
    hint: 'First 2(ŷ − y) = 2·(−0.2). Then multiply by ŷ(1 − ŷ) = 0.8·0.2.',
    explain: '2·(0.8 − 1) = −0.4, and −0.4 · 0.8 · 0.2 = −0.064.',
  },
  {
    id: 'grad-shape',
    type: 'choice',
    prompt: 'W1 has shape (2, 3) and the batch has 32 examples. What is the shape of dW1 = ∂L/∂W1?',
    options: [
      {
        text: '(2, 3)',
        correct: true,
        explain:
          'A gradient has one entry per parameter, so it always has the parameter’s shape. X.T @ dZ1 is (2, 32) @ (32, 3) = (2, 3).',
      },
      {
        text: '(32, 3)',
        correct: false,
        explain:
          'That is the shape of dZ1: one gradient per example and per unit. dW1 sums those over the batch.',
      },
      {
        text: '(32, 2, 3)',
        correct: false,
        explain:
          'Per-example gradients are summed (with the 1/N of the mean loss already inside dZ), so the batch axis disappears.',
      },
    ],
  },
  {
    id: 'why-check',
    type: 'choice',
    prompt: 'Why compare backprop with (L(θ + ε) − L(θ − ε)) / 2ε?',
    options: [
      {
        text: 'It only needs the forward pass, so it catches mistakes in the backward pass',
        correct: true,
        explain:
          'The estimate does not use any of the backward code. If both agree to about 1e-7 relative error or better, the backward pass is right.',
      },
      {
        text: 'Training uses it because it is faster than backprop',
        correct: false,
        explain:
          'It needs two forward passes per parameter: millions of passes for a real network. Backprop gets every gradient for about the cost of one more pass.',
      },
      {
        text: 'It is exact, while backprop is an approximation',
        correct: false,
        explain:
          'The other way round: backprop is exact up to rounding; the central difference has an error of order ε².',
      },
    ],
  },
  {
    id: 'step-sign',
    type: 'numeric',
    prompt: 'A weight is w = 0.5 with ∂L/∂w = 0.08. What is w after one gradient descent step with η = 0.5?',
    answer: 0.46,
    tolerance: 0.0001,
    hint: 'w ← w − η · ∂L/∂w.',
    explain:
      '0.5 − 0.5 · 0.08 = 0.5 − 0.04 = 0.46. A positive gradient means increasing w raises the loss, so the step lowers w.',
  },
  {
    id: 'order',
    type: 'order',
    prompt: 'Put the backward pass of the 2-2-1 network in order.',
    items: [
      '∂L/∂ŷ = 2(ŷ − y)',
      '∂L/∂z2 = ∂L/∂ŷ · ŷ(1 − ŷ)',
      '∂L/∂W2 and ∂L/∂a1 from ∂L/∂z2',
      '∂L/∂z1 = ∂L/∂a1 · (1 − a1²)',
      '∂L/∂W1 from ∂L/∂z1',
    ],
    explain:
      'Each gradient is built from the one after it in the forward pass: the chain rule applied from the loss backwards.',
  },
];

export const numericExercise: Exercise = {
  id: 'numerical-gradient',
  prompt:
    'Write `numerical_grad(f, params, i, eps=1e-5)`: the central-difference estimate of the derivative of `f(params)` with respect to `params[i]`. Do not change the caller’s list.',
  starter: `def numerical_grad(f, params, i, eps=1e-5):
    # Evaluate f with params[i] nudged up by eps and down by eps
    pass`,
  hints: [
    'Copy the list twice with `list(params)`, add `eps` to entry i of one copy and subtract it from the other.',
    'Return `(f(up) - f(down)) / (2 * eps)`.',
  ],
  solution: `def numerical_grad(f, params, i, eps=1e-5):
    up = list(params)
    down = list(params)
    up[i] += eps
    down[i] -= eps
    return (f(up) - f(down)) / (2 * eps)`,
  explanation:
    'The central difference averages the slope on both sides of the point, so its error shrinks like ε² instead of ε for a one-sided difference. Copying the list keeps the caller’s parameters unchanged, which matters when you check every parameter in a loop.',
  tests: `f = lambda p: p[0] ** 2 + 3 * p[1]
g = numerical_grad(f, [2.0, 5.0], 0)
assert abs(g - 4.0) < 1e-6, f'd/dp0 of p0**2 + 3*p1 at p0 = 2 should be 4, got {g}'
g = numerical_grad(f, [2.0, 5.0], 1)
assert abs(g - 3.0) < 1e-6, f'd/dp1 should be 3, got {g}'
params = [2.0, 5.0]
numerical_grad(f, params, 0)
assert params == [2.0, 5.0], 'numerical_grad must not change the list it is given'
import math
g = numerical_grad(lambda p: math.tanh(p[0]), [0.5], 0)
assert abs(g - (1 - math.tanh(0.5) ** 2)) < 1e-8, f'the slope of tanh at 0.5 is 1 - tanh(0.5)**2, got {g}'`,
};
