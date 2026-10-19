import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/orchestration/dags-retries',
  title: 'Orchestration, scheduling, retries and dependencies',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Model a pipeline as a DAG of tasks',
    'Configure retries and explain idempotency',
    'Explain how a failure propagates to downstream tasks',
  ],
  prerequisites: ['data/etl/etl-vs-elt'],
  concepts: [],
} satisfies LessonMeta;
