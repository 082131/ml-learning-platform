import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/capstone/ml-ready-pipeline',
  title: 'Capstone: a reliable pipeline that prepares data for an ML model',
  level: 'advanced',
  minutes: 600,
  kind: 'capstone',
  objectives: [
    'Build an orchestrated pipeline from raw source data to model-ready features',
    'Add validation with a quarantine, data tests and freshness monitoring',
    'Make every task idempotent, so the pipeline can be rerun and backfilled safely',
    'Document how to run, rerun and recover the pipeline',
  ],
  prerequisites: ['data/features/training-serving', 'data/orchestration/dags-retries'],
  concepts: ['validation-rule', 'quarantine'],
} satisfies LessonMeta;
