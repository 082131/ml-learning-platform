import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/ingestion/apis-formats',
  title: 'APIs, JSON, CSV, Parquet and ingestion',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Ingest every page of a paginated REST API, with retries and rate limits',
    'Choose between CSV, JSON and Parquet for landing data, and explain the trade-offs',
    'Detect a schema change in incoming data and decide whether to fail, adapt or set the data aside',
    'Make an ingestion job safe to rerun without creating duplicate rows',
  ],
  prerequisites: ['data/relational/joins-indexes'],
  concepts: [],
} satisfies LessonMeta;
