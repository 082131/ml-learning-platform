import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/quality/observability-testing',
  title: 'Data quality, lineage, observability and pipeline tests',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write data quality checks for freshness, volume, schema and value ranges',
    'Trace lineage from a report back to the sources and transforms that produced it',
    'Unit-test transform code and run data tests on every pipeline run',
    'Choose which failures should stop a pipeline and which should only alert',
  ],
  prerequisites: ['data/orchestration/dags-retries'],
  concepts: ['validation-rule', 'quarantine'],
} satisfies LessonMeta;
