import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/performance/indexes-plans',
  title: 'Indexes and query plans',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain an index as a sorted copy of some columns that lets the database skip rows',
    'Read EXPLAIN QUERY PLAN output: SCAN, SEARCH, USING INDEX, USING COVERING INDEX',
    'Apply the leftmost-prefix rule to decide whether a composite index helps a query',
    'Recognise predicates that cannot use an index and rewrite them',
  ],
  prerequisites: ['sql/aggregation/group-by'],
  concepts: [],
} satisfies LessonMeta;
