import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/fit-regularization',
  title: 'Overfitting, underfitting and regularization',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Recognize overfitting and underfitting from train and validation curves',
    'Explain how model complexity affects error',
    'Use L2 regularization to reduce overfitting',
  ],
  prerequisites: ['ml/classical/linear-regression'],
  concepts: [],
} satisfies LessonMeta;
