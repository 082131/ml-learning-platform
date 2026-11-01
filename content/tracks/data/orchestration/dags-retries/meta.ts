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
  concepts: ['dag', 'orchestrator', 'trigger-rule', 'backfill', 'idempotent', 'exponential-backoff', 'etl'],
  references: [
    {
      title: 'Apache Airflow: Dags (dependencies, scheduling, catchup and backfill)',
      url: 'https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html',
      version: 'Airflow 3.3',
    },
    {
      title: 'Apache Airflow: tasks (retries, task instance states, trigger rules)',
      url: 'https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/tasks.html',
      version: 'Airflow 3.3',
    },
    {
      title: 'Apache Airflow: TaskFlow API',
      url: 'https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/taskflow.html',
      version: 'Airflow 3.3',
    },
    {
      title: 'Apache Airflow: best practices (idempotent tasks)',
      url: 'https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html',
      version: 'Airflow 3.3',
    },
    {
      title: 'Dagster: assets and partitions',
      url: 'https://docs.dagster.io/guides/build/partitions-and-backfills',
    },
  ],
} satisfies LessonMeta;
