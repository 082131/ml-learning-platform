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
  concepts: [],
} satisfies LessonMeta;
