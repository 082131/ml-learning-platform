import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/python-sql/formats-sql-intro',
  title: 'Python for data, SQL and data formats overview',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Write basic SELECT, WHERE and GROUP BY queries',
    'Compare CSV, JSON and Parquet for a given use',
    'Move data between Python and a SQL database',
  ],
  prerequisites: ['ml/foundations/pandas-dataframes'],
  concepts: [],
} satisfies LessonMeta;
