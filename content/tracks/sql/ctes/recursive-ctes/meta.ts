import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/ctes/recursive-ctes',
  title: 'Recursive CTEs: hierarchies and date spines',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain a recursive CTE as a starting set plus a step repeated until it adds no rows',
    'Walk a manager hierarchy to any depth and compute each person’s level and path',
    'Generate a calendar (date spine) to show days with no data as zero',
    'Guarantee a recursive query stops',
  ],
  prerequisites: ['sql/ctes/subqueries-ctes'],
  concepts: ['recursive-cte', 'date-spine', 'self-join', 'cte'],
  references: [
    { title: 'SQLite: Recursive common table expressions', url: 'https://www.sqlite.org/lang_with.html#recursive_common_table_expressions', version: '3.54' },
    { title: 'SQLite: Date and time functions', url: 'https://www.sqlite.org/lang_datefunc.html', version: '3.54' },
    { title: 'PostgreSQL: Recursive queries (SEARCH and CYCLE)', url: 'https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-RECURSIVE', version: '18' },
  ],
} satisfies LessonMeta;
