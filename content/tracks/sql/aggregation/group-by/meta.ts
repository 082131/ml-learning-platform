import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/aggregation/group-by',
  title: 'GROUP BY, aggregates and HAVING',
  level: 'beginner',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain GROUP BY as "one output row per bucket" and predict the number of result rows',
    'Choose between COUNT(*), COUNT(column) and COUNT(DISTINCT column) and know how each treats NULL',
    'Decide whether a condition belongs in WHERE or HAVING from the logical query order',
    'Build conditional aggregates with SUM(CASE ...) to pivot categories into columns',
  ],
  prerequisites: ['sql/foundations/nulls-logic'],
  concepts: [],
} satisfies LessonMeta;
