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
  concepts: ['sql-join', 'foreign-key', 'outer-join', 'cross-join', 'self-join', 'relationship-cardinality'],
  references: [
    { title: 'SQLite: SELECT (join operators, RIGHT and FULL JOIN since 3.39)', url: 'https://www.sqlite.org/lang_select.html#from_clause', version: '3.54' },
    { title: 'PostgreSQL: Joined tables', url: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN', version: '18' },
  ],
} satisfies LessonMeta;
