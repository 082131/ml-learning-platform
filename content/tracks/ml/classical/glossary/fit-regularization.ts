import type { GlossaryTerm } from '@/lib/types';

const L = 'ml/classical/fit-regularization';

export default [
  {
    id: 'overfitting',
    term: 'Overfitting',
    short:
      'A model so flexible that it fits the noise in its training data: training error is low, but error on new data is much higher.',
    introducedIn: L,
    aliases: ['overfit'],
  },
  {
    id: 'underfitting',
    term: 'Underfitting',
    short:
      'A model too simple (or too constrained) to capture the real pattern: error is high on the training data and on new data alike.',
    introducedIn: L,
    aliases: ['underfit'],
  },
  {
    id: 'regularization',
    term: 'Regularization',
    short:
      'Adding a penalty to the training objective that discourages complex solutions, such as large weights, to reduce overfitting.',
    introducedIn: L,
  },
  {
    id: 'ridge-regression',
    term: 'Ridge regression (L2 regularization)',
    short:
      'Least squares plus λ times the sum of squared weights. Solved in closed form by (XᵀX + λI)w = Xᵀy; larger λ pulls the weights toward 0.',
    introducedIn: L,
    aliases: ['ridge', 'L2 regularization', 'L2 penalty', 'Tikhonov regularization', 'weight decay'],
  },
  {
    id: 'bias-variance-tradeoff',
    term: 'Bias–variance trade-off',
    short:
      'Simple models make systematic errors (bias); flexible models change a lot with the particular training sample (variance). The best validation error usually lies between the two.',
    introducedIn: L,
    aliases: ['bias-variance', 'bias variance trade-off'],
  },
] satisfies GlossaryTerm[];
