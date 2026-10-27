import type { GlossaryTerm } from '@/lib/types';

const LESSON = 'ml/classical/logistic-regression';

export default [
  {
    id: 'logistic-regression',
    term: 'Logistic regression',
    short:
      'A classification model that turns a weighted sum of the features into a probability with the sigmoid: p = σ(w·x + b).',
    long: 'Despite its name it is used for classification. It is trained by minimizing the log loss; predicting the positive class when p ≥ 0.5 gives a linear decision boundary.',
    introducedIn: LESSON,
  },
  {
    id: 'sigmoid',
    term: 'Sigmoid',
    short: 'The function σ(z) = 1 / (1 + e^(−z)), which maps any real number into the interval (0, 1).',
    long: 'σ(0) = 0.5, σ(z) approaches 1 for large z and 0 for very negative z, and σ(−z) = 1 − σ(z). Also called the logistic function.',
    introducedIn: LESSON,
    aliases: ['logistic function', 'σ'],
  },
  {
    id: 'log-loss',
    term: 'Log loss',
    short:
      'The loss for predicted probabilities: −mean(y·log p + (1 − y)·log(1 − p)). Confident wrong predictions cost the most.',
    long: 'Also called binary cross-entropy. A prediction of p = 0.5 costs log 2 ≈ 0.6931; p = 0.01 for a true positive costs −log 0.01 ≈ 4.6.',
    introducedIn: LESSON,
    aliases: ['cross-entropy', 'binary cross-entropy', 'logistic loss'],
  },
  {
    id: 'decision-boundary',
    term: 'Decision boundary',
    short: 'The set of feature values where a classifier switches from one predicted class to another.',
    long: 'For logistic regression with a 0.5 threshold it is where w·x + b = 0: a line for two features, a plane or hyperplane for more.',
    introducedIn: LESSON,
  },
] satisfies GlossaryTerm[];
