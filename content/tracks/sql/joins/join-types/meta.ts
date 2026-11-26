import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/joins/join-types',
  title: 'Join types and where filters go',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Predict the rows of INNER, LEFT, RIGHT, FULL and CROSS joins from the matching pairs',
    'Explain why a filter on the right table in WHERE turns a LEFT JOIN into an inner join, and fix it with ON',
    'Join three or more tables along their keys and check row counts at each step',
    'Write self-joins to compare rows of the same table',
  ],
  prerequisites: ['sql/aggregation/group-by'],
  concepts: [],
} satisfies LessonMeta;
