import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/cross-validation',
  title: 'Cross-validation',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Run k-fold cross-validation and read the per-fold scores',
    'Explain why cross-validation gives a more reliable estimate',
    'Choose between a validation split and cross-validation',
  ],
  prerequisites: ['ml/classical/fit-regularization'],
  concepts: [],
} satisfies LessonMeta;
