import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/ingestion/apis-formats',
  title: 'APIs, JSON, CSV, Parquet and ingestion',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Ingest data from a paginated API',
    'Choose a file format and explain the trade-offs',
    'Handle schema changes in incoming data',
  ],
  prerequisites: ['data/relational/joins-indexes'],
  concepts: [],
} satisfies LessonMeta;
