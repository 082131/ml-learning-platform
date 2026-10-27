import type { LessonMeta } from '@/lib/types';

const SK = 'scikit-learn 1.8';

export default {
  id: 'ml/classical/fit-regularization',
  title: 'Overfitting, underfitting and regularization',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Recognize underfitting and overfitting from training and validation error curves',
    'Explain how polynomial degree and the penalty λ change a model’s flexibility and its error',
    'Fit ridge regression in closed form, (XᵀX + λI)w = Xᵀy, with NumPy, leaving the intercept unpenalized',
    'Choose a degree and λ with a validation set, not with training error',
  ],
  prerequisites: ['ml/classical/linear-regression'],
  concepts: [
    'overfitting',
    'underfitting',
    'regularization',
    'ridge-regression',
    'bias-variance-tradeoff',
    'mean-squared-error',
    'hyperparameter',
    'validation-set',
    'closed-form-solution',
  ],
  references: [
    {
      title: 'numpy.linalg.solve',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.linalg.solve.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'numpy.vander',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.vander.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'sklearn.linear_model.Ridge',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.Ridge.html',
      version: SK,
    },
    {
      title: 'Linear models: ridge regression and classification',
      url: 'https://scikit-learn.org/stable/modules/linear_model.html#ridge-regression-and-classification',
      version: SK,
    },
    {
      title: 'sklearn.preprocessing.PolynomialFeatures',
      url: 'https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.PolynomialFeatures.html',
      version: SK,
    },
    {
      title: 'Underfitting vs. overfitting (scikit-learn example)',
      url: 'https://scikit-learn.org/stable/auto_examples/model_selection/plot_underfitting_overfitting.html',
      version: SK,
    },
  ],
} satisfies LessonMeta;
