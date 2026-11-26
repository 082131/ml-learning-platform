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
  concepts: ['group-by', 'aggregate-function', 'having-clause', 'conditional-aggregation', 'table-grain'],
  references: [
    { title: 'SQLite: Aggregate functions', url: 'https://www.sqlite.org/lang_aggfunc.html', version: '3.54' },
    { title: 'SQLite: SELECT (GROUP BY, HAVING, bare columns)', url: 'https://www.sqlite.org/lang_select.html', version: '3.54' },
    { title: 'PostgreSQL: GROUP BY and HAVING', url: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP', version: '18' },
  ],
} satisfies LessonMeta;
