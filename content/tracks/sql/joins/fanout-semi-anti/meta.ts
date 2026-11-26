import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/joins/fanout-semi-anti',
  title: 'Fan-out, semi-joins and anti-joins',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how joining two one-to-many tables multiplies rows and inflates sums',
    'Fix fan-out by aggregating each side to the join key before joining',
    'Answer "which rows have a match" with EXISTS (semi-join) and "which have none" with NOT EXISTS (anti-join)',
    'Explain why NOT IN returns nothing when the list contains NULL',
  ],
  prerequisites: ['sql/joins/join-types'],
  concepts: ['join-fan-out', 'semi-join', 'anti-join', 'relationship-cardinality'],
  references: [
    { title: 'SQLite: EXISTS and IN operators', url: 'https://www.sqlite.org/lang_expr.html#the_exists_operator', version: '3.54' },
    { title: 'PostgreSQL: Subquery expressions (EXISTS, IN, NOT IN)', url: 'https://www.postgresql.org/docs/current/functions-subquery.html', version: '18' },
  ],
} satisfies LessonMeta;
