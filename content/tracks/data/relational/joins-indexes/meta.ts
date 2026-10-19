import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/relational/joins-indexes',
  title: 'Schemas, joins, indexes and query plans',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Design a small schema with primary and foreign keys',
    'Predict the rows of inner, left and full joins',
    'Explain how an index changes the rows a query touches',
  ],
  prerequisites: ['data/python-sql/formats-sql-intro'],
  concepts: [],
} satisfies LessonMeta;
