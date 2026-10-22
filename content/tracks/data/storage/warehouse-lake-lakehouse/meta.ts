import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/storage/warehouse-lake-lakehouse',
  title: 'Warehouses, lakes and lakehouses',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Compare a data warehouse, a data lake and a lakehouse on cost, schema enforcement and query speed',
    'Choose a storage architecture for a given use case and justify it',
    'Explain what a table format such as Delta Lake or Apache Iceberg adds on top of Parquet files',
    'Explain how partitioning files by a column speeds up queries that filter on it',
  ],
  prerequisites: ['data/etl/etl-vs-elt'],
  concepts: ['data-warehouse', 'elt'],
} satisfies LessonMeta;
