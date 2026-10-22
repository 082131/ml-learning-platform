import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/python-sql/formats-sql-intro',
  title: 'Python for data, SQL and data formats overview',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Write SELECT queries that filter with WHERE, sort with ORDER BY and summarize with GROUP BY',
    'Compare CSV, JSON and Parquet on schema, size and read speed for a given use',
    'Load a query result into a pandas DataFrame and write a DataFrame back to a SQL table',
    'Explain what a table schema and column types guarantee about the data',
  ],
  prerequisites: ['ml/foundations/pandas-dataframes'],
  concepts: [],
} satisfies LessonMeta;
