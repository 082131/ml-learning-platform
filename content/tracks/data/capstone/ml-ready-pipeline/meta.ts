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
  concepts: [
    'validation-rule',
    'quarantine',
    'idempotent',
    'backfill',
    'data-test',
    'point-in-time-correctness',
  ],
  references: [
    {
      title: 'Python: sqlite3',
      url: 'https://docs.python.org/3.13/library/sqlite3.html',
      version: 'Python 3.13',
    },
    { title: 'SQLite: date and time functions', url: 'https://sqlite.org/lang_datefunc.html' },
    {
      title: 'Apache Airflow: DAG runs, backfills and the logical date',
      url: 'https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html',
    },
    {
      title: 'Feast: point-in-time joins',
      url: 'https://docs.feast.dev/getting-started/concepts/point-in-time-joins',
    },
  ],
} satisfies LessonMeta;
