import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'mse',
    type: 'numeric',
    prompt:
      'A model predicts 2, 3 and 7 where the targets are 1, 3 and 5. What is the mean squared error? (Give a decimal.)',
    answer: 5 / 3,
    tolerance: 0.005,
    hint: 'Errors are 1, 0 and 2. Square them, then average.',
    explain: '(1² + 0² + 2²) / 3 = 5 / 3 ≈ 1.667.',
  },
  {
    id: 'one-step',
    type: 'numeric',
    prompt:
      'f(x) = (x − 2)² + 1, so f′(x) = 2(x − 2). Starting at x = 6 with learning rate η = 0.25, what is x after one gradient descent step?',
    answer: 4,
    tolerance: 0,
    hint: 'x₁ = x₀ − η · f′(x₀), and f′(6) = 8.',
    explain: 'x₁ = 6 − 0.25 · 8 = 4. The next step goes to 3, halving the distance to the minimum each time.',
  },
  {
    id: 'bounce',
    type: 'choice',
    prompt:
      'With f(x) = (x − 2)² + 1, η = 1 and x₀ = 6, gradient descent visits 6, −2, 6, −2, … What is going on?',
    options: [
      {
        text: 'Each step overshoots the minimum by exactly as much as it started from, so x bounces forever',
        correct: true,
        explain:
          'x₁ = 6 − 1 · 8 = −2, then f′(−2) = −8 sends it back to 6. Any η above 1 overshoots by more each time and diverges; below 1 it converges.',
      },
      {
        text: 'The function has two minima, at 6 and −2',
        correct: false,
        explain: 'It has a single minimum at x = 2; f(6) = f(−2) = 17.',
      },
      {
        text: 'The gradient is computed wrongly',
        correct: false,
        explain: 'f′(6) = 8 and f′(−2) = −8 are right. The learning rate is the problem.',
      },
    ],
  },
  {
    id: 'local',
    type: 'choice',
    prompt:
      'On a non-convex loss, gradient descent stops at a point where the gradient is 0. What can you conclude?',
    options: [
      {
        text: 'It is a flat point, which may be a local minimum rather than the best one',
        correct: true,
        explain:
          'Gradient descent only sees the local slope. A different start can end in a different valley.',
      },
      {
        text: 'It is the global minimum',
        correct: false,
        explain: 'That is guaranteed only for convex functions, which have a single valley.',
      },
      {
        text: 'The learning rate was too large',
        correct: false,
        explain: 'A too-large learning rate makes the loss bounce or grow; it does not make the gradient 0.',
      },
    ],
  },
];

export const descentExercise: Exercise = {
  id: 'gradient-descent',
  prompt:
    'Write `descend(df, x0, lr, steps)` that runs `steps` gradient descent updates from `x0` and returns the final x.',
  starter: `def descend(df, x0, lr, steps):
    # df is the derivative: a function of x
    x = x0
    # repeat the update x <- x - lr * df(x)
    return x`,
  hints: ['Use a `for` loop over `range(steps)`.', 'Inside it: `x = x - lr * df(x)`.'],
  solution: `def descend(df, x0, lr, steps):
    x = x0
    for _ in range(steps):
        x = x - lr * df(x)
    return x`,
  explanation:
    'Each update moves x against the slope by η times its size. On (x − 2)² + 1 with η = 0.25 every step halves the distance to the minimum, so 6 goes to 4, 3, 2.5, …',
  tests: `df = lambda x: 2 * (x - 2)
assert descend(df, 6.0, 0.25, 1) == 4.0, 'one step from 6 with lr 0.25 reaches 4'
assert descend(df, 6.0, 0.25, 3) == 2.5, 'three steps reach 2.5'
assert descend(df, 6.0, 0.1, 0) == 6.0, 'zero steps leave x where it started'
assert descend(df, 6.0, 1.0, 2) == 6.0, 'lr = 1 bounces between 6 and -2'
assert abs(descend(df, 6.0, 0.1, 20) - 2.046116860184274) < 1e-12, 'matches the lesson code: 20 steps of lr 0.1'`,
};
