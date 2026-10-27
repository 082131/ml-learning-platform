import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/logistic-regression',
  title: 'Logistic regression and decision boundaries',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how the sigmoid turns a score z = w·x + b into a probability, and compute it for one example',
    'Draw the decision boundary of a two-feature logistic model and say which side predicts which class',
    'Train a logistic model with batch gradient descent on log loss, and read its weights, loss and accuracy',
    'Standardize features with training-set statistics only, and explain why',
    'Explain why scikit-learn’s LogisticRegression gives smaller weights than plain gradient descent (L2, C = 1.0)',
  ],
  prerequisites: ['ml/classical/linear-regression'],
  concepts: [
    'logistic-regression',
    'sigmoid',
    'log-loss',
    'decision-boundary',
    'gradient-descent',
    'learning-rate',
    'training-set',
    'test-set',
    'label',
    'feature',
  ],
  references: [
    {
      title: 'sklearn.linear_model.LogisticRegression',
      url: 'https://scikit-learn.org/1.8/modules/generated/sklearn.linear_model.LogisticRegression.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'User guide: Logistic regression',
      url: 'https://scikit-learn.org/1.8/modules/linear_model.html#logistic-regression',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'sklearn.preprocessing.StandardScaler',
      url: 'https://scikit-learn.org/1.8/modules/generated/sklearn.preprocessing.StandardScaler.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'numpy.std (ddof defaults to 0)',
      url: 'https://numpy.org/doc/2.4/reference/generated/numpy.std.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'pandas.DataFrame.iloc',
      url: 'https://pandas.pydata.org/pandas-docs/version/3.0/reference/api/pandas.DataFrame.iloc.html',
      version: 'pandas 3.0',
    },
  ],
} satisfies LessonMeta;
