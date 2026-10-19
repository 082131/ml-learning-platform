import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/relational/joins-indexes',
  title: 'Schemas, joins, indexes and query plans',
  level: 'beginner',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Design a small schema with primary and foreign keys',
    'Predict the rows of inner, left and full outer joins, including how NULL keys behave',
    'Explain why an index lets a query read far fewer entries than a full table scan',
    'Read a query plan to tell whether a query scans a table or uses an index',
  ],
  prerequisites: ['data/python-sql/formats-sql-intro'],
  concepts: [
    'primary-key',
    'foreign-key',
    'sql-join',
    'sql-null',
    'database-index',
    'full-table-scan',
    'query-plan',
  ],
  references: [
    {
      title: 'SQLite: the SELECT statement (joins, ORDER BY ... NULLS LAST)',
      url: 'https://www.sqlite.org/lang_select.html',
      version: 'SQLite 3.45',
    },
    {
      title: 'SQLite: query planning (how indexes are used)',
      url: 'https://www.sqlite.org/queryplanner.html',
      version: 'SQLite 3.45',
    },
    { title: 'SQLite: EXPLAIN QUERY PLAN', url: 'https://www.sqlite.org/eqp.html', version: 'SQLite 3.45' },
    {
      title: 'SQLite: foreign key support (PRAGMA foreign_keys)',
      url: 'https://www.sqlite.org/foreignkeys.html',
      version: 'SQLite 3.45',
    },
    {
      title: 'PostgreSQL: joined tables',
      url: 'https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN',
      version: 'PostgreSQL 17 and later',
    },
  ],
} satisfies LessonMeta;
