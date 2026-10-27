import type { GlossaryTerm } from '@/lib/types';

const L = 'ml/classical/splits-leakage';

export default [
  {
    id: 'training-set',
    term: 'Training set',
    short:
      'The rows a model learns from: every fitted number (weights, means, chosen features) comes from them.',
    introducedIn: L,
    aliases: ['train set', 'training data'],
  },
  {
    id: 'validation-set',
    term: 'Validation set',
    short:
      'Rows held out from training and used to compare models and choose settings such as hyperparameters.',
    long: 'Because you make choices by looking at its score, the validation score is slightly optimistic. That is why a separate test set is kept for the final estimate.',
    introducedIn: L,
    aliases: ['validation split', 'dev set', 'holdout set'],
  },
  {
    id: 'test-set',
    term: 'Test set',
    short:
      'Rows kept apart until the very end and used once, to estimate how the finished model does on new data.',
    introducedIn: L,
    aliases: ['test split', 'held-out test set'],
  },
  {
    id: 'data-leakage',
    term: 'Data leakage',
    short:
      'Information from outside the training rows (test rows, or the answer itself) reaching the model during training, which makes scores look better than the model really is.',
    introducedIn: L,
    aliases: ['leakage', 'leak'],
  },
  {
    id: 'hyperparameter',
    term: 'Hyperparameter',
    short:
      'A setting you choose before training, such as the number of features to keep or a polynomial degree, rather than a value the model learns.',
    introducedIn: L,
    aliases: ['hyper-parameter'],
  },
  {
    id: 'feature-selection',
    term: 'Feature selection',
    short:
      'Keeping only some of the features, for example those most correlated with the label, before fitting a model.',
    introducedIn: L,
  },
] satisfies GlossaryTerm[];
