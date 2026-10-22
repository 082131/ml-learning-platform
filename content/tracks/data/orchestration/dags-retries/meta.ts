import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/orchestration/dags-retries',
  title: 'Orchestration, scheduling, retries and dependencies',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Model a pipeline as a DAG of tasks with explicit dependencies',
    'Configure retries with backoff, and explain why tasks must be idempotent to retry safely',
    'Predict which downstream tasks run, wait or are skipped when a task fails',
    'Backfill a pipeline for past dates without double-counting',
  ],
  prerequisites: ['data/etl/etl-vs-elt'],
  concepts: ['etl', 'elt'],
} satisfies LessonMeta;
