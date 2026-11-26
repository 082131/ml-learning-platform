import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/performance/query-tuning',
  title: 'Tuning queries and warehouse costs',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Follow a tuning loop: measure, read the plan, change one thing, measure again',
    'Replace per-row subqueries with joins or window functions when the plan shows repeated work',
    'Explain how columnar warehouses charge for and speed up queries (columns read, partitions pruned)',
    'Decide when to pre-aggregate into a summary table',
  ],
  prerequisites: ['sql/performance/indexes-plans'],
  concepts: [],
} satisfies LessonMeta;
