import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/features/training-serving',
  title: 'Feature pipelines and training-serving consistency',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Build features once and reuse them for training and serving',
    'Explain training-serving skew and how to detect it',
    'Compute point-in-time correct features',
  ],
  prerequisites: ['data/quality/observability-testing', 'ml/classical/features-scaling'],
  concepts: [],
} satisfies LessonMeta;
