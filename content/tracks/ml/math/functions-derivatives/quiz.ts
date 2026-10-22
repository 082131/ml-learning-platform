import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'power-rule',
    type: 'numeric',
    prompt: 'f(x) = x³ − 3x. What is f′(2)?',
    answer: 9,
    tolerance: 0,
    hint: 'f′(x) = 3x² − 3 by the power rule. Put in x = 2.',
    explain: '3 · 2² − 3 = 12 − 3 = 9.',
  },
  {
    id: 'sign',
    type: 'choice',
    prompt: 'At some point, f′(x) = −4. What happens to f if you increase x a little?',
    options: [
      { text: 'f decreases, about 4 times as fast as x increases', correct: true, explain: 'A negative slope means the graph goes down to the right: f(x + h) ≈ f(x) − 4h.' },
      { text: 'f increases', correct: false, explain: 'That would need a positive derivative.' },
      { text: 'f(x) equals −4', correct: false, explain: 'The derivative is the slope at x, not the value of f there.' },
    ],
  },
  {
    id: 'forward-estimate',
    type: 'numeric',
    prompt: 'f(x) = x². Compute the forward difference (f(3 + h) − f(3)) / h with h = 0.1.',
    answer: 6.1,
    tolerance: 0.0001,
    hint: 'f(3.1) = 9.61 and f(3) = 9.',
    explain: '(9.61 − 9) / 0.1 = 0.61 / 0.1 = 6.1. The exact derivative is 2 · 3 = 6, so the error is h = 0.1.',
  },
  {
    id: 'tiny-h',
    type: 'choice',
    prompt: 'Why does h = 1e-15 give a worse estimate than h = 1e-6?',
    options: [
      {
        text: 'f(x + h) − f(x) loses almost all its digits to floating-point rounding',
        correct: true,
        explain: 'Floats keep about 16 significant digits. Subtracting two nearly equal numbers leaves only a few correct ones, and dividing by a tiny h magnifies the rest.',
      },
      {
        text: 'The derivative changes when h is small',
        correct: false,
        explain: 'The exact derivative does not depend on h. Only the estimate does.',
      },
      {
        text: 'Python rounds 1e-15 to 0',
        correct: false,
        explain: '1e-15 is a normal float. With h = 0 you would get ZeroDivisionError instead.',
      },
    ],
  },
];

export const derivativeExercise: Exercise = {
  id: 'central-difference',
  prompt: 'Write `derivative(f, x, h=1e-5)` that estimates f′(x) with the central difference.',
  starter: `def derivative(f, x, h=1e-5):
    pass`,
  hints: [
    'The central difference uses one point on each side of x.',
    'Return `(f(x + h) - f(x - h)) / (2 * h)`.',
  ],
  solution: `def derivative(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)`,
  explanation:
    'The central difference is the slope of the secant from x − h to x + h. For smooth functions its error shrinks like h², so h = 1e-5 gives about 10 correct digits without hitting round-off.',
  tests: `assert abs(derivative(lambda x: x * x, 3) - 6) < 1e-6, 'the slope of x*x at 3 is 6'
assert abs(derivative(lambda x: x * x * x - 3 * x, 2) - 9) < 1e-6, 'the slope of x**3 - 3x at 2 is 9'
assert abs(derivative(lambda x: 5 * x + 1, -7) - 5) < 1e-6, 'a straight line has the same slope everywhere'
assert abs(derivative(lambda x: x * x, 1, h=0.1) - 2) < 1e-9, 'the central difference is exact for x*x, even with h = 0.1'`,
};
