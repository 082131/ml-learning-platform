import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/pipelines/dag-orchestration',
  title: 'Orchestrating pipelines as DAGs',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Model a pipeline as a DAG and find a topological order and the critical path',
    'Predict a run’s timeline from worker slots, retries and retry delays',
    'Explain trigger rules, upstream_failed, and how Airflow decides whether a DAG run succeeded',
    'Read and write the same pipeline in Airflow 3 and Prefect 3, and know when cron is no longer enough',
  ],
  prerequisites: ['automation/scheduling/rerun-safe-jobs'],
  concepts: ['dag', 'orchestrator', 'topological-order', 'critical-path', 'trigger-rule', 'upstream-failed', 'idempotent'],
  references: [
    { title: 'Airflow 3.4: Dags', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/dags.html', version: '3.4.0' },
    { title: 'Airflow 3.4: Dag Runs (DAG run status from leaf tasks)', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/dag-run.html', version: '3.4.0' },
    { title: 'Airflow 3.4: Tasks (retries, trigger rules)', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/tasks.html', version: '3.4.0' },
    { title: 'Prefect 3: Tasks and retries', url: 'https://docs.prefect.io/v3/develop/write-tasks' },
    { title: 'Python documentation: graphlib', url: 'https://docs.python.org/3/library/graphlib.html', version: '3.13' },
  ],
} satisfies LessonMeta;
