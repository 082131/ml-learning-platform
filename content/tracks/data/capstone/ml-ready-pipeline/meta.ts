import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/capstone/ml-ready-pipeline',
  title: 'Capstone: a reliable pipeline that prepares data for an ML model',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Build an orchestrated pipeline from raw data to model-ready features',
    'Add validation, tests and monitoring',
    'Document how to rerun and recover it',
  ],
  prerequisites: ['data/features/training-serving'],
  concepts: [],
} satisfies LessonMeta;
