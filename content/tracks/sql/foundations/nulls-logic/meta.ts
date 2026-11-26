import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/foundations/nulls-logic',
  title: 'NULL, CASE and three-valued logic',
  level: 'beginner',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Explain NULL as "unknown" and predict TRUE, FALSE or UNKNOWN for comparisons and AND/OR/NOT',
    'Find and replace missing values with IS NULL, IS DISTINCT FROM and COALESCE',
    'Turn conditions into values with CASE, and know which branch wins',
    'Avoid the type and integer-division traps of SQLite',
  ],
  prerequisites: ['sql/foundations/select-basics'],
  concepts: ['sql-null', 'three-valued-logic', 'coalesce', 'case-expression', 'type-affinity'],
  references: [
    { title: 'SQLite: Expressions (IS, IS DISTINCT FROM, CASE)', url: 'https://www.sqlite.org/lang_expr.html', version: '3.54' },
    { title: 'SQLite: NULL handling in SQLite versus other engines', url: 'https://www.sqlite.org/nulls.html' },
    { title: 'SQLite: Datatypes and type affinity', url: 'https://www.sqlite.org/datatype3.html', version: '3.54' },
    { title: 'PostgreSQL: Comparison functions and operators (IS DISTINCT FROM)', url: 'https://www.postgresql.org/docs/current/functions-comparison.html', version: '18' },
  ],
} satisfies LessonMeta;
