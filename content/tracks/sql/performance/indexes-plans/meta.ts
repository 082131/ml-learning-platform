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
  concepts: ['database-index', 'query-plan', 'full-table-scan', 'covering-index', 'composite-index', 'sargable'],
  references: [
    { title: 'SQLite: EXPLAIN QUERY PLAN', url: 'https://www.sqlite.org/eqp.html', version: '3.54' },
    { title: 'SQLite: Query optimizer overview (index use, the leftmost-prefix rule)', url: 'https://www.sqlite.org/optoverview.html', version: '3.54' },
    { title: 'SQLite: CREATE INDEX', url: 'https://www.sqlite.org/lang_createindex.html', version: '3.54' },
    { title: 'PostgreSQL: Multicolumn indexes', url: 'https://www.postgresql.org/docs/current/indexes-multicolumn.html', version: '18' },
  ],
} satisfies LessonMeta;
