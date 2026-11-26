import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/foundations/select-basics',
  title: 'Tables, rows and your first query',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Describe a table as rows (things) and columns (facts about each thing), and read a schema',
    'Write SELECT queries that pick columns, filter rows with WHERE, sort with ORDER BY and cut with LIMIT',
    'Explain the order SQL evaluates a query in, and use it to predict which names and filters are allowed where',
    'Filter text, numbers and dates correctly with =, IN, BETWEEN and LIKE',
  ],
  prerequisites: [],
  concepts: ['sql', 'table-schema', 'primary-key', 'sql-clause', 'logical-query-order', 'column-alias'],
  references: [
    { title: 'SQLite: SELECT', url: 'https://www.sqlite.org/lang_select.html', version: '3.54' },
    { title: 'SQLite: Expressions (LIKE, BETWEEN, IN)', url: 'https://www.sqlite.org/lang_expr.html', version: '3.54' },
    { title: 'PostgreSQL: SELECT (standard behaviour of aliases)', url: 'https://www.postgresql.org/docs/current/sql-select.html', version: '18' },
    { title: 'sql.js: SQLite compiled to WebAssembly', url: 'https://github.com/sql-js/sql.js', version: '1.16.0' },
  ],
} satisfies LessonMeta;
