import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'residual',
    type: 'numeric',
    prompt:
      'A Gentoo penguin has a 21.5 cm flipper and weighs 5.05 kg. For the line ŷ = 0.4·x − 3.5, what is its residual r = y − ŷ, in kg?',
    answer: -0.05,
    tolerance: 0.001,
    hint: 'First the prediction: 0.4 × 21.5 − 3.5. Then subtract it from the true mass.',
    explain:
      'ŷ = 0.4 × 21.5 − 3.5 = 8.6 − 3.5 = 5.1 kg, so r = 5.05 − 5.1 = −0.05 kg: the penguin is slightly below the line.',
  },
  {
    id: 'why-square',
    type: 'choice',
    prompt: 'Why does MSE square the residuals instead of just averaging them?',
    options: [
      {
        text: 'So that errors above and below the line cannot cancel out, and large errors cost more than small ones',
        correct: true,
        explain:
          'A squared residual is never negative, and doubling a miss quadruples its cost. (For the least-squares line the plain residuals average exactly 0, so a plain average would say nothing.)',
      },
      {
        text: 'To make the result have the same unit as y',
        correct: false,
        explain:
          'Squaring does the opposite: MSE is in kg² when y is in kg. Its square root (RMSE) is back in kg.',
      },
      {
        text: 'Because squaring makes the computation faster',
        correct: false,
        explain: 'Squaring is an extra multiplication; the reason is what it measures, not speed.',
      },
      {
        text: 'So that points far from the line count less',
        correct: false,
        explain:
          'It is the reverse: squaring makes far-away points count much more, which is also why MSE is sensitive to outliers.',
      },
    ],
  },
  {
    id: 'intercept',
    type: 'numeric',
    prompt:
      'For some data, x̄ = 20 cm, ȳ = 4.2 kg and the least-squares slope is 0.43 kg per cm. What is the least-squares intercept, in kg?',
    answer: -4.4,
    tolerance: 0.001,
    hint: 'The least-squares line passes through the point of averages (x̄, ȳ): intercept = ȳ − slope·x̄.',
    explain: 'intercept = 4.2 − 0.43 × 20 = 4.2 − 8.6 = −4.4 kg.',
  },
  {
    id: 'raw-slow',
    type: 'choice',
    prompt:
      'Gradient descent on raw flipper lengths (around 20 cm) gets stuck near MSE 0.206 for hundreds of steps, while the closed form reaches 0.121. Centering x fixes it. Why?',
    options: [
      {
        text: 'With x around 20, changing the slope also moves every prediction by about 20 times as much, so the loss is a long narrow valley; a learning rate small enough for the steep direction barely moves the intercept',
        correct: true,
        explain:
          'The steep direction limits η to about 0.0025, and along the shallow direction the intercept then changes by tiny amounts per step. Centering makes the two directions independent and similarly steep.',
      },
      {
        text: 'Raw x has a different best line, which has a higher MSE',
        correct: false,
        explain:
          'Centering only reparameterizes the same line: the best slope is identical and the intercept converts back with b − w·x̄. Both reach MSE 0.121 eventually.',
      },
      {
        text: 'The MSE loss has several local minima for raw x',
        correct: false,
        explain:
          'The MSE of a line is a bowl with a single minimum whatever x is; the problem is the bowl’s shape, not extra minima.',
      },
      {
        text: 'Gradient descent cannot handle negative intercepts',
        correct: false,
        explain:
          'Parameters can take any sign; with centered x it reaches the intercept −4.37 in a few dozen steps.',
      },
    ],
  },
  {
    id: 'diverge',
    type: 'choice',
    prompt:
      'After a few steps of gradient descent the MSE is larger at every step and the slope flips sign each time. What should you change first?',
    options: [
      {
        text: 'Lower the learning rate',
        correct: true,
        explain:
          'Growing loss with alternating signs is the signature of overshooting: each step jumps past the minimum by more than the last.',
      },
      {
        text: 'Run more steps',
        correct: false,
        explain: 'More steps of a diverging run only make the numbers bigger, until they overflow.',
      },
      {
        text: 'Start from a different initial slope',
        correct: false,
        explain: 'The MSE bowl has one minimum, and a too-large step overshoots from any start.',
      },
    ],
  },
  {
    id: 'gd-order',
    type: 'order',
    prompt: 'Put the parts of one batch gradient descent update in order.',
    items: [
      'Predict ŷ = w·x + b for every training example',
      'Compute the errors ŷ − y',
      'Average them into the gradients 2·mean(err·x) and 2·mean(err)',
      'Subtract η times each gradient from w and b',
    ],
    explain:
      'Predictions give errors, errors give gradients, and gradients give the update. Then the next step starts from the new w and b.',
  },
];

export const lineExercise: Exercise = {
  id: 'fit-line',
  prompt:
    'Write `mse(x, y, w, b)` and `fit_line(x, y)` in plain Python (no NumPy). `fit_line` returns `(slope, intercept)` of the least-squares line.',
  starter: `def mse(x, y, w, b):
    # Average of (y[i] - (w * x[i] + b)) ** 2 over all i
    pass


def fit_line(x, y):
    # slope = sum((x - x_bar) * (y - y_bar)) / sum((x - x_bar) ** 2), intercept = y_bar - slope * x_bar
    pass`,
  hints: [
    '`mse`: loop over `zip(x, y)`, add up `(yi - (w * xi + b)) ** 2`, and divide by `len(x)`.',
    '`fit_line`: compute `x_bar = sum(x) / len(x)` and `y_bar` the same way first.',
    'Then `sxy = sum((xi - x_bar) * (yi - y_bar) for xi, yi in zip(x, y))`, `sxx = sum((xi - x_bar) ** 2 for xi in x)`, and `slope = sxy / sxx`.',
  ],
  solution: `def mse(x, y, w, b):
    total = 0.0
    for xi, yi in zip(x, y):
        total += (yi - (w * xi + b)) ** 2
    return total / len(x)


def fit_line(x, y):
    n = len(x)
    x_bar = sum(x) / n
    y_bar = sum(y) / n
    sxy = sum((xi - x_bar) * (yi - y_bar) for xi, yi in zip(x, y))
    sxx = sum((xi - x_bar) ** 2 for xi in x)
    slope = sxy / sxx
    return slope, y_bar - slope * x_bar`,
  explanation:
    'mse is the loop from the lesson, written with zip. fit_line uses the closed form: the slope is how much x and y vary together divided by how much x varies, and the intercept puts the line through (x̄, ȳ). No learning rate or steps are needed.',
  tests: `assert mse([0, 1, 2], [1, 4, 4], 2, 1) is not None, 'mse returned None: compute the average and return it'
assert fit_line([0, 1, 2], [1, 4, 4]) is not None, 'fit_line returned None: return (slope, intercept)'
assert abs(mse([0, 1, 2], [1, 4, 4], 2, 1) - 2 / 3) < 1e-12, 'mse([0, 1, 2], [1, 4, 4], 2, 1) should be 2/3: residuals 0, 1, -1'
assert mse([1, 2], [3, 5], 2, 1) == 0, 'a line through every point has mse 0'
s, b = fit_line([0, 1, 2], [1, 4, 4])
assert abs(s - 1.5) < 1e-12 and abs(b - 1.5) < 1e-12, 'fit_line([0, 1, 2], [1, 4, 4]) should be (1.5, 1.5)'
x = [18.1, 17.8, 19.4, 18.9, 19.9, 19.0, 21.5, 21.0, 22.1, 21.6, 19.7, 20.1]
y = [3.75, 3.25, 3.75, 3.95, 3.775, 4.25, 5.05, 4.4, 5.45, 5.0, 3.3, 4.45]
s, b = fit_line(x, y)
assert round(s, 4) == 0.4302 and round(b, 4) == -4.3737, 'the penguins should give slope 0.4302 and intercept -4.3737'
assert round(mse(x, y, s, b), 4) == 0.121, 'the least-squares line should have MSE 0.121 on the penguins'
assert mse(x, y, s + 0.01, b) > mse(x, y, s, b), 'any other slope should have a larger MSE'`,
};
