import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'sgd-step',
    type: 'numeric',
    prompt:
      'Gradient descent on f(x, y) = ½(x² + 10y²) starts at (−4, 1.5) with η = 0.1. The gradient is (x, 10y). What is x after one step?',
    answer: -3.6,
    tolerance: 0.001,
    hint: 'The gradient at the start is (−4, 15). Subtract η times its x part from x.',
    explain: 'x ← x − η·gₓ = −4 − 0.1·(−4) = −4 + 0.4 = −3.6. (And y ← 1.5 − 0.1·15 = 0.)',
  },
  {
    id: 'max-lr',
    type: 'numeric',
    prompt:
      'On the same bowl, each SGD step multiplies the y error by (1 − 10η). What is the largest learning rate for which y does not grow? Give the boundary value.',
    answer: 0.2,
    tolerance: 0.001,
    hint: 'y stops shrinking when |1 − 10η| reaches 1.',
    explain:
      '|1 − 10η| ≤ 1 means 0 ≤ η ≤ 0.2. At η = 0.2 the factor is −1 and y flips between 1.5 and −1.5 forever; above it, y grows and SGD diverges.',
  },
  {
    id: 'adam-first-step',
    type: 'choice',
    prompt:
      'With bias correction, how far does Adam move each coordinate on its very first step (ignoring ε)?',
    options: [
      {
        text: 'Exactly η, against the sign of that coordinate’s gradient',
        correct: true,
        explain:
          'At t = 1, m̂ = g and v̂ = g², so the step is η·g / |g| = η·sign(g) in every coordinate, however steep.',
      },
      {
        text: 'η times the gradient, as in SGD',
        correct: false,
        explain: 'Adam divides by √v̂ = |g| at t = 1, so the gradient’s size cancels out.',
      },
      {
        text: 'About 0.1·η, because m starts at zero',
        correct: false,
        explain:
          'That is what happens without bias correction: m₁ = 0.1·g. Dividing by 1 − β₁ = 0.1 undoes exactly that.',
      },
    ],
  },
  {
    id: 'momentum-why',
    type: 'choice',
    prompt:
      'In the elongated bowl, why does momentum reach the minimum faster than plain SGD with the same η?',
    options: [
      {
        text: 'Gradients along the shallow x direction keep the same sign, so the velocity builds up there, while the y zigzags partly cancel',
        correct: true,
        explain:
          'The velocity is a running sum, so consistent directions add up (up to 1 / (1 − β) = 10 times for β = 0.9) and alternating ones cancel.',
      },
      {
        text: 'Momentum computes the exact minimum of the quadratic',
        correct: false,
        explain: 'It only uses gradients, like SGD. It overshoots too: look at y turning negative in step 2.',
      },
      {
        text: 'Momentum uses a smaller learning rate automatically',
        correct: false,
        explain:
          'The learning rate is the same; the step is η times the velocity, which can be much larger than the gradient.',
      },
    ],
  },
  {
    id: 'adam-order',
    type: 'order',
    prompt: 'Put one Adam step in order.',
    items: [
      'Compute the gradient g at θ',
      'Update the running means m and v',
      'Divide them by 1 − β₁ᵗ and 1 − β₂ᵗ (bias correction)',
      'Move θ by η·m̂ / (√v̂ + ε)',
    ],
    explain:
      'Gradient first, then the averages, then their bias correction, and the update uses the corrected values.',
  },
];

export const momentumExercise: Exercise = {
  id: 'momentum-step',
  prompt:
    'Write `momentum_step(theta, u, g, lr, beta)` for lists of numbers. It returns the new `(theta, u)` with u ← β·u + g and θ ← θ − η·u.',
  starter: `def momentum_step(theta, u, g, lr, beta):
    # Update the velocity u first, then move theta along it.
    pass`,
  hints: [
    'Work coordinate by coordinate: `zip(u, g)` pairs each velocity with its gradient.',
    'New velocity: `[beta * ui + gi for ui, gi in zip(u, g)]`.',
    'Then `[t - lr * ui for t, ui in zip(theta, new_u)]`, and return both lists.',
  ],
  solution: `def momentum_step(theta, u, g, lr, beta):
    new_u = [beta * ui + gi for ui, gi in zip(u, g)]
    new_theta = [t - lr * ui for t, ui in zip(theta, new_u)]
    return new_theta, new_u`,
  explanation:
    'The velocity is updated before the move, as in PyTorch’s SGD with momentum. On the bowl from (−4, 1.5) with η = 0.05 and β = 0.9, the first step has u = g = (−4, 15), and the second uses u = 0.9·(−4, 15) + (−3.8, 7.5) = (−7.4, 21).',
  tests: `theta, u = momentum_step([-4.0, 1.5], [0.0, 0.0], [-4.0, 15.0], 0.05, 0.9)
assert all(abs(a - b) < 1e-9 for a, b in zip(theta, [-3.8, 0.75])), f'first step should reach (-3.8, 0.75), got {theta}'
assert u == [-4.0, 15.0], 'with u starting at 0, the first velocity equals the gradient'
theta, u = momentum_step(theta, u, [-3.8, 7.5], 0.05, 0.9)
assert all(abs(a - b) < 1e-9 for a, b in zip(u, [-7.4, 21.0])), f'second velocity should be (-7.4, 21), got {u}'
assert all(abs(a - b) < 1e-9 for a, b in zip(theta, [-3.43, -0.3])), f'second step should reach (-3.43, -0.3), got {theta}'
same, _ = momentum_step([1.0], [5.0], [0.0], 0.1, 0.0)
assert abs(same[0] - 1.0) < 1e-12, 'with beta = 0 and a zero gradient, theta should not move'`,
};
