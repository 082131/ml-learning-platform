import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/splits-leakage',
  title: 'Train, validation and test sets, and data leakage',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Split data into train, validation and test sets',
    'Explain what each split is for',
    'Spot data leakage and explain why it inflates scores',
  ],
  prerequisites: ['ml/classical/features-scaling'],
  concepts: [],
} satisfies LessonMeta;
