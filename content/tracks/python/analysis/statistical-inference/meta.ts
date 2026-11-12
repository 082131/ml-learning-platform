import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/analysis/statistical-inference',
  title: 'Confidence intervals, permutation tests and A/B tests',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain sampling variability and the standard error with a simulation',
    'Build a bootstrap confidence interval and interpret it correctly',
    'Run a permutation test and read its p-value',
    'Plan an A/B test: metric, sample size, and the traps of peeking and multiple comparisons',
  ],
  prerequisites: ['python/analysis/eda-visualization', 'ml/math/statistics-intuition'],
  concepts: ['standard-error', 'confidence-interval', 'p-value', 'permutation-test', 'ab-test'],
  references: [
    {
      title: 'NumPy: random Generator',
      url: 'https://numpy.org/doc/2.4/reference/random/generator.html',
      version: 'NumPy 2.4',
    },
    {
      title: 'SciPy: permutation_test',
      url: 'https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.permutation_test.html',
      version: 'SciPy 1.16',
    },
    {
      title: 'Wasserstein and Lazar (2016): The ASA statement on p-values',
      url: 'https://doi.org/10.1080/00031305.2016.1154108',
    },
  ],
} satisfies LessonMeta;
