import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/math/statistics-intuition',
  title: 'Mean, variance, standard deviation, correlation vs causation',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Compute mean, variance and standard deviation',
    'Read correlation from a scatter plot',
    'Explain why correlation does not show causation, with a confounder example',
  ],
  prerequisites: ['ml/math/probability'],
  concepts: ['mean', 'variance', 'standard-deviation', 'correlation', 'confounder'],
  references: [
    {
      title: 'numpy.std',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.std.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'numpy.corrcoef',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.corrcoef.html',
      version: 'NumPy 2.5',
    },
    {
      title: 'statistics: mathematical statistics functions',
      url: 'https://docs.python.org/3/library/statistics.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
