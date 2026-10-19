import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/hyperparameter-tuning',
  title: 'Hyperparameter tuning: grid, random and early stopping',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compare grid search and random search on a known function',
    'Use early stopping to save compute',
    'Budget a tuning run and report its results',
  ],
  prerequisites: ['ml/practice/experiment-tracking'],
  concepts: [],
} satisfies LessonMeta;
