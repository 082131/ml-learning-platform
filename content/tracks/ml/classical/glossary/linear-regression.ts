import type { GlossaryTerm } from '@/lib/types';

const LESSON = 'ml/classical/linear-regression';

export default [
  {
    id: 'linear-regression',
    term: 'Linear regression',
    short: 'A model that predicts a number as a weighted sum of the features plus a constant: ŷ = w·x + b.',
    long: 'With one feature the model is a straight line with slope w and intercept b. Training picks w and b that minimize the mean squared error on the training data.',
    introducedIn: LESSON,
  },
  {
    id: 'residual',
    term: 'Residual',
    short: 'The difference between a true value and the model’s prediction for it: r = y − ŷ.',
    long: 'Positive when the example lies above the fitted line, negative when below. Residuals are what the model got wrong on the data it was fitted to.',
    introducedIn: LESSON,
  },
  {
    id: 'closed-form-solution',
    term: 'Closed-form solution',
    short:
      'An answer computed directly by a formula, in a fixed number of steps, rather than by repeated updates.',
    long: 'For linear regression, setting the derivatives of the MSE to zero gives the normal equations, whose solution is the least-squares line: slope = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)², intercept = ȳ − slope·x̄.',
    introducedIn: LESSON,
    aliases: ['normal equations', 'least squares', 'ordinary least squares', 'OLS'],
  },
] satisfies GlossaryTerm[];
