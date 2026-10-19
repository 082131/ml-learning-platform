import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/quality/observability-testing',
  title: 'Data quality, lineage, observability and pipeline tests',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Write data quality checks for freshness, volume and schema',
    'Trace lineage from a report back to its sources',
    'Test pipeline code like application code',
  ],
  prerequisites: ['data/orchestration/dags-retries'],
  concepts: [],
} satisfies LessonMeta;
