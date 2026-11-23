import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/capstone/nightly-pipeline',
  title: 'Capstone: automate a nightly ML pipeline end to end',
  level: 'advanced',
  minutes: 90,
  kind: 'capstone',
  objectives: [
    'Combine scripts, schedules, retries, idempotent writes, CI, gates and alerts into one working automation',
    'Run a nightly scoring and weekly retraining pipeline that is safe to rerun and backfill',
    'Ship model updates through CI, a release gate and an approval',
    'Prove the automation works: tests, a rerun drill, a backfill drill and a failure drill',
  ],
  prerequisites: ['automation/pipelines/schedules-backfills', 'automation/cicd/model-delivery', 'automation/events/agent-guardrails'],
  concepts: ['orchestrator', 'idempotent', 'release-gate', 'heartbeat-monitor', 'backfill', 'continuous-delivery'],
  references: [
    { title: 'Google Cloud: MLOps, continuous delivery and automation pipelines in machine learning', url: 'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning' },
    { title: 'Airflow 3.4: Best practices', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/best-practices.html', version: '3.4.0' },
    { title: 'Google SRE workbook: Eliminating Toil', url: 'https://sre.google/workbook/eliminating-toil/' },
  ],
} satisfies LessonMeta;
