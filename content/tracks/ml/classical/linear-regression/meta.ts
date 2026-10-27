import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/linear-regression',
  title: 'Linear regression',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Fit a line by hand by adjusting slope and intercept, and read its residuals',
    'Compute the mean squared error of a line, step by step, for a small dataset',
    'Compute the least-squares line with the closed-form formula, NumPy and scikit-learn',
    'Train the same line with gradient descent, and explain why centering x makes it converge much faster',
    'Recognize a diverging learning rate and the 1-D input error scikit-learn raises',
  ],
  prerequisites: ['ml/math/loss-optimization', 'ml/classical/splits-leakage'],
  concepts: [
    'linear-regression',
    'residual',
    'mean-squared-error',
    'closed-form-solution',
    'gradient-descent',
    'learning-rate',
    'model',
    'parameter',
    'feature',
    'label',
  ],
  references: [
    {
      title: 'sklearn.linear_model.LinearRegression',
      url: 'https://scikit-learn.org/1.8/modules/generated/sklearn.linear_model.LinearRegression.html',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'User guide: Ordinary Least Squares',
      url: 'https://scikit-learn.org/1.8/modules/linear_model.html#ordinary-least-squares',
      version: 'scikit-learn 1.8',
    },
    {
      title: 'numpy.polyfit',
      url: 'https://numpy.org/doc/2.4/reference/generated/numpy.polyfit.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'numpy.mean',
      url: 'https://numpy.org/doc/2.4/reference/generated/numpy.mean.html',
      version: 'NumPy 2.4',
    },
    {
      title:
        'palmerpenguins: Palmer Archipelago (Antarctica) penguin data (Horst, Hill and Gorman, 2020; CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
      version: 'R package 0.1.0',
    },
  ],
} satisfies LessonMeta;
