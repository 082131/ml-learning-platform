import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'sigmoid-value',
    type: 'numeric',
    prompt:
      'A penguin gets the score z = 2. What probability p = σ(z) = 1 / (1 + e^(−z)) does the model give it? (4 decimals)',
    answer: 0.8808,
    tolerance: 0.0005,
    hint: 'e^(−2) ≈ 0.1353.',
    explain:
      'p = 1 / (1 + 0.1353) = 1 / 1.1353 = 0.8808, so the model predicts the positive class (Chinstrap).',
  },
  {
    id: 'boundary',
    type: 'choice',
    prompt:
      'With two features and the threshold 0.5, why is the decision boundary of logistic regression a straight line?',
    options: [
      {
        text: 'p ≥ 0.5 exactly when z = w1·x1 + w2·x2 + b ≥ 0, and z = 0 is the equation of a line',
        correct: true,
        explain:
          'The sigmoid is increasing and σ(0) = 0.5, so the threshold on p is a threshold on the linear score z.',
      },
      {
        text: 'Because the sigmoid is a straight line near z = 0',
        correct: false,
        explain: 'The sigmoid is curved everywhere; what matters is that it crosses 0.5 only at z = 0.',
      },
      {
        text: 'Because the features were standardized',
        correct: false,
        explain:
          'Standardizing rescales the axes but the boundary is a line for raw features too: z is linear in them either way.',
      },
      {
        text: 'It is not: the boundary bends around the training points',
        correct: false,
        explain:
          'That describes flexible models such as trees or neural networks. Logistic regression on raw features can only draw a line.',
      },
    ],
  },
  {
    id: 'log-loss-value',
    type: 'numeric',
    prompt:
      'A Chinstrap (y = 1) gets p = 0.1. What does it add to the log loss, −(y·ln p + (1 − y)·ln(1 − p))? (4 decimals)',
    answer: 2.3026,
    tolerance: 0.0005,
    hint: 'With y = 1 only the first term remains: −ln p.',
    explain:
      '−ln 0.1 = 2.3026. A confident wrong prediction costs far more than an unsure one: p = 0.5 would cost ln 2 = 0.6931.',
  },
  {
    id: 'train-stats',
    type: 'choice',
    prompt:
      'Why are the features standardized with the mean and standard deviation of the training penguins only?',
    options: [
      {
        text: 'The test set must stand in for unseen penguins, so nothing about it may shape the model, including the scaling',
        correct: true,
        explain:
          'Statistics from test rows would leak information about them into training and make the test score optimistic.',
      },
      {
        text: 'Because the test set is too small to compute a standard deviation',
        correct: false,
        explain: '54 penguins are plenty for a standard deviation. The reason is leakage, not size.',
      },
      {
        text: 'It does not matter which rows are used, because the results are identical',
        correct: false,
        explain:
          'Different rows give different means and standard deviations, so the standardized values and the weights change.',
      },
    ],
  },
  {
    id: 'sklearn-weights',
    type: 'choice',
    prompt:
      'scikit-learn’s LogisticRegression() gives w1 = 3.81, while long plain gradient descent gives about 10.87 on the same data. Why?',
    options: [
      {
        text: 'Its default C = 1.0 adds an L2 penalty that pulls the weights toward 0; with C = np.inf it also gives 10.87',
        correct: true,
        explain:
          'The penalty trades a slightly higher log loss for smaller weights, which makes the probabilities less extreme.',
      },
      {
        text: 'scikit-learn standardizes the features again inside fit',
        correct: false,
        explain:
          'LogisticRegression does not scale its input; both versions see the same standardized features.',
      },
      {
        text: 'scikit-learn uses a different, wrong formula for the sigmoid',
        correct: false,
        explain:
          'Both use σ(z) = 1 / (1 + e^(−z)). The difference is the objective (penalty), not the model.',
      },
      {
        text: 'Gradient descent has not finished, and both would agree after more steps',
        correct: false,
        explain:
          'Gradient descent without a penalty heads for the unpenalized answer, about 10.87, not 3.81.',
      },
    ],
  },
];

export const logisticExercise: Exercise = {
  id: 'logistic-functions',
  prompt:
    'Write `sigmoid(z)` and `log_loss(y, p)` in plain Python. `log_loss` takes two lists (labels 0 or 1, and probabilities) and returns the mean log loss.',
  starter: `import math


def sigmoid(z):
    pass


def log_loss(y, p):
    # mean of -(y_i * log(p_i) + (1 - y_i) * log(1 - p_i))
    pass`,
  hints: [
    '`sigmoid`: `return 1 / (1 + math.exp(-z))`.',
    '`log_loss`: add up `yi * math.log(pi) + (1 - yi) * math.log(1 - pi)` over `zip(y, p)`.',
    'Divide the sum by `len(y)` and flip its sign: the loss is positive.',
  ],
  solution: `import math


def sigmoid(z):
    return 1 / (1 + math.exp(-z))


def log_loss(y, p):
    total = 0.0
    for yi, pi in zip(y, p):
        total += yi * math.log(pi) + (1 - yi) * math.log(1 - pi)
    return -total / len(y)`,
  explanation:
    'The sigmoid maps any score to (0, 1). Log loss averages −log of the probability the model gave to the true class: −log p for a positive, −log(1 − p) for a negative. Its minimum, 0, needs certainty on every example.',
  tests: `assert sigmoid(0) is not None, 'sigmoid returned None: return 1 / (1 + math.exp(-z))'
assert sigmoid(0) == 0.5, 'sigmoid(0) should be 0.5'
assert round(sigmoid(2), 4) == 0.8808, 'sigmoid(2) should be about 0.8808'
assert abs(sigmoid(-3) - (1 - sigmoid(3))) < 1e-12, 'sigmoid(-z) should equal 1 - sigmoid(z)'
assert log_loss([1], [0.5]) is not None, 'log_loss returned None: return the mean'
assert abs(log_loss([1], [0.5]) - math.log(2)) < 1e-12, 'p = 0.5 for a positive should cost log 2 = 0.6931'
assert abs(log_loss([1, 0], [0.5, 0.8]) - (math.log(2) + math.log(5)) / 2) < 1e-12, 'log_loss([1, 0], [0.5, 0.8]) should be 1.1513'
assert log_loss([0, 1], [0.1, 0.9]) < log_loss([0, 1], [0.4, 0.6]), 'confident correct predictions should cost less'`,
};
