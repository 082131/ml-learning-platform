import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/pipelines/schedules-backfills',
  title: 'Schedules, catchup and backfills',
  level: 'advanced',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Distinguish when a run happens from the period it is for: logical dates and data intervals',
    'Predict which runs a scheduler creates for a start date, a schedule, a timetable and catchup',
    'Backfill a date range safely, with the right reprocessing behaviour and a concurrency limit',
    'Design tasks so that late data, reruns and backfills give correct, repeatable results',
  ],
  prerequisites: ['automation/pipelines/dag-orchestration'],
  concepts: ['logical-date', 'data-interval', 'catchup', 'backfill', 'idempotent'],
  references: [
    { title: 'Airflow 3.4: Timetables', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/authoring-and-scheduling/timetable.html', version: '3.4.0' },
    { title: 'Airflow 3.4: Dag Runs (catchup)', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/dag-run.html', version: '3.4.0' },
    { title: 'Airflow 3.4: Backfill', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/core-concepts/backfill.html', version: '3.4.0' },
    { title: 'Airflow 3.4: Templates reference (data_interval_start, logical_date)', url: 'https://airflow.apache.org/docs/apache-airflow/3.4.0/templates-ref.html', version: '3.4.0' },
  ],
} satisfies LessonMeta;
