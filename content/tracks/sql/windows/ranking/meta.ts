import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/windows/ranking',
  title: 'Window functions and ranking',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how a window function keeps every row while still seeing other rows, unlike GROUP BY',
    'Use PARTITION BY and ORDER BY inside OVER to define each row’s window',
    'Choose between ROW_NUMBER, RANK and DENSE_RANK by how they treat ties',
    'Write top-N-per-group queries and compare each row with its group’s total',
  ],
  prerequisites: ['sql/ctes/subqueries-ctes'],
  concepts: ['window-function', 'window-partition', 'ranking-functions', 'logical-query-order'],
  references: [
    { title: 'SQLite: Window functions', url: 'https://www.sqlite.org/windowfunctions.html', version: '3.54' },
    { title: 'PostgreSQL: Window functions tutorial', url: 'https://www.postgresql.org/docs/current/tutorial-window.html', version: '18' },
    { title: 'PostgreSQL: Window function calls', url: 'https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS', version: '18' },
  ],
} satisfies LessonMeta;
