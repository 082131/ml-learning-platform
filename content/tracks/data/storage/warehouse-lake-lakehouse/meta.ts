import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/storage/warehouse-lake-lakehouse',
  title: 'Warehouses, lakes and lakehouses',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare a data warehouse, a data lake and a lakehouse',
    'Choose a storage architecture for a use case',
    'Explain what a table format adds on top of files',
  ],
  prerequisites: ['data/etl/etl-vs-elt'],
  concepts: [],
} satisfies LessonMeta;
