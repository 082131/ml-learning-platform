import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'diagnose-overfit',
    type: 'choice',
    prompt: 'A degree-12 fit has training MSE 0.03 and validation MSE 3.66. What is happening?',
    options: [
      {
        text: 'Overfitting: the curve bends through the training noise and misses new points',
        correct: true,
        explain:
          'Low training error with much higher validation error is the signature of overfitting. The flexibility was spent on noise.',
      },
      {
        text: 'Underfitting: the model is too simple',
        correct: false,
        explain:
          'An underfitting model has high training error too. Here training error is the lowest of any degree.',
      },
      {
        text: 'The validation points are mislabeled',
        correct: false,
        explain: 'The same validation points give MSE 0.07 at degree 3. The model, not the data, changed.',
      },
    ],
  },
  {
    id: 'diagnose-underfit',
    type: 'choice',
    prompt:
      'Degree 1: training MSE 0.29, validation MSE 0.29. The noise variance is 0.09. What should you try?',
    options: [
      {
        text: 'More flexibility: a higher degree or a smaller λ',
        correct: true,
        explain:
          'Both errors are similar and far above the noise level, so the model is too stiff to follow the curve: underfitting.',
      },
      {
        text: 'A larger λ',
        correct: false,
        explain: 'A larger penalty makes the model stiffer still, which makes underfitting worse.',
      },
      {
        text: 'Nothing: train and validation agree, so the model is good',
        correct: false,
        explain:
          'Agreement only says the model is not overfitting. Both errors are about three times the noise variance of 0.09, so a better curve exists.',
      },
    ],
  },
  {
    id: 'train-error-choice',
    type: 'choice',
    prompt: 'Why not choose the degree with the lowest training error?',
    options: [
      {
        text: 'Training error keeps falling as the degree grows, so it always picks the most flexible model',
        correct: true,
        explain:
          'Each higher degree contains the lower ones as special cases, so its best training fit can only be as good or better. Validation error is what turns back up.',
      },
      {
        text: 'Training error is computed with a different formula from validation error',
        correct: false,
        explain: 'Both are the same mean squared error, just on different points.',
      },
      {
        text: 'Training error is always zero',
        correct: false,
        explain:
          'It reaches zero only when there are at least as many weights as points (degree 19 for 20 points). Below that it is positive but still decreasing.',
      },
    ],
  },
  {
    id: 'lambda-effect',
    type: 'numeric',
    prompt:
      'Ridge through the origin with one feature has slope w = Σxy / (Σx² + λ). With x = [1, 2, 3] and y = [2, 4, 6], what is w when λ = 14?',
    answer: 1,
    tolerance: 0,
    hint: 'Σxy = 1·2 + 2·4 + 3·6 and Σx² = 1 + 4 + 9.',
    explain:
      'Σxy = 2 + 8 + 18 = 28 and Σx² = 14, so w = 28 / (14 + 14) = 1. Without the penalty it would be 28 / 14 = 2: λ shrinks the weight toward 0.',
  },
  {
    id: 'intercept',
    type: 'choice',
    prompt: 'Why is the intercept usually left out of the penalty?',
    options: [
      {
        text: 'Penalizing it would pull the whole curve toward y = 0, which says nothing about how wiggly the curve is',
        correct: true,
        explain:
          'The penalty is meant to limit flexibility. The intercept only shifts the curve up or down; shrinking it biases every prediction toward 0.',
      },
      {
        text: 'The intercept is always 0',
        correct: false,
        explain:
          'In this lesson’s fits it ranges from about 0.01 to 0.18; for data far from y = 0 it is large.',
      },
      {
        text: 'np.linalg.solve cannot handle a penalty on the first weight',
        correct: false,
        explain:
          'It can: setting penalty[0, 0] = λ instead of 0 is a valid system. It just gives a worse model.',
      },
    ],
  },
];

export const ridgeExercise: Exercise = {
  id: 'ridge-slope',
  prompt:
    'Write `mse(predictions, targets)` and `ridge_slope(xs, ys, lam)`, the ridge solution for a line through the origin: w = Σxy / (Σx² + λ).',
  starter: `def mse(predictions, targets):
    # Mean of the squared differences
    pass


def ridge_slope(xs, ys, lam):
    # sum(x * y) / (sum(x * x) + lam)
    pass`,
  hints: [
    '`zip(predictions, targets)` pairs the values up; square each difference, add them, divide by `len(targets)`.',
    'For the slope: `sum(x * y for x, y in zip(xs, ys))` on top, `sum(x * x for x in xs) + lam` below.',
    'This is (XᵀX + λ)w = Xᵀy with a single column: XᵀX is the number Σx² and Xᵀy is Σxy.',
  ],
  solution: `def mse(predictions, targets):
    return sum((p - t) ** 2 for p, t in zip(predictions, targets)) / len(targets)


def ridge_slope(xs, ys, lam):
    return sum(x * y for x, y in zip(xs, ys)) / (sum(x * x for x in xs) + lam)`,
  explanation:
    'With one column, XᵀX is the single number Σx² and Xᵀy is Σxy, so the ridge system (XᵀX + λ)w = Xᵀy becomes one division. λ sits in the denominator: the larger it is, the closer w gets to 0, whatever the data say.',
  tests: `assert mse([1, 2, 3], [1, 2, 3]) == 0, 'a perfect fit has MSE 0'
assert abs(mse([4 / 3, 7 / 3, 10 / 3], [1, 2, 4]) - 2 / 9) < 1e-12, 'squared errors 1/9, 1/9, 4/9 average to 2/9'
assert abs(ridge_slope([1, 2, 3], [2, 4, 6], 0) - 2) < 1e-12, 'with lam = 0 this is least squares: 28 / 14 = 2'
assert abs(ridge_slope([1, 2, 3], [2, 4, 6], 14) - 1) < 1e-12, 'lam = 14 doubles the denominator: 28 / (14 + 14) = 1'
assert abs(ridge_slope([1, 2, 3], [2, 4, 6], 1e9)) < 1e-6, 'a huge lam shrinks the slope toward 0'
assert abs(ridge_slope([1, -1], [3, -1], 0) - 2) < 1e-12, 'sum(x*y) = 3 + 1 = 4, sum(x*x) = 2, slope 2'`,
};
