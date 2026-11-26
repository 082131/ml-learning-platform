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
  concepts: [],
} satisfies LessonMeta;
