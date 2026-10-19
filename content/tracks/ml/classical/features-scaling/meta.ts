import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/features-scaling',
  title: 'Feature engineering and scaling',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Create new features from existing columns',
    'Standardize and min-max scale features',
    'Explain how scaling changes distances between points',
  ],
  prerequisites: ['ml/classical/eda'],
  concepts: ['feature'],
} satisfies LessonMeta;
