import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/hyperparameter-tuning',
  title: 'Hyperparameter tuning: grid, random and early stopping',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain why random search usually beats grid search for the same budget, and when it does not',
    'Choose search ranges and scales (log scale for rates) for common hyperparameters',
    'Use early stopping with a patience that matches the noise in the validation curve',
    'Run a tuning study that keeps the test set untouched and reports results over seeds',
  ],
  prerequisites: ['ml/practice/experiment-tracking'],
  concepts: ['hyperparameter-search', 'random-search', 'early-stopping'],
  references: [
    {
      title: 'Bergstra and Bengio, Random Search for Hyper-Parameter Optimization (JMLR 2012)',
      url: 'https://www.jmlr.org/papers/v13/bergstra12a.html',
    },
    {
      title: 'scikit-learn: Tuning the hyper-parameters of an estimator',
      url: 'https://scikit-learn.org/1.9/modules/grid_search.html',
      version: 'scikit-learn 1.9',
    },
    {
      title: 'Prechelt, Early Stopping — But When? (Neural Networks: Tricks of the Trade, 1998)',
      url: 'https://doi.org/10.1007/3-540-49430-8_3',
    },
    {
      title: 'Li et al., Hyperband: A Novel Bandit-Based Approach to Hyperparameter Optimization (JMLR 2018)',
      url: 'https://jmlr.org/papers/v18/16-558.html',
    },
  ],
} satisfies LessonMeta;
