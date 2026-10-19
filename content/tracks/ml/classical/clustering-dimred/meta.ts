import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/clustering-dimred',
  title: 'K-means and PCA',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Run k-means step by step on a small dataset',
    'Choose a number of clusters and explain the trade-off',
    'Project data onto principal components and read the variance explained',
  ],
  prerequisites: ['ml/math/dot-product', 'ml/classical/features-scaling'],
  concepts: ['unsupervised-learning'],
} satisfies LessonMeta;
