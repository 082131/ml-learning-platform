import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/ctes/subqueries-ctes',
  title: 'Subqueries and CTEs',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Use scalar, IN and correlated subqueries and say when each runs',
    'Break a long query into named steps with WITH, and inspect each step on its own',
    'Choose between a subquery, a CTE and a join for the same question',
    'Debug a multi-step query by checking the row count and grain of every step',
  ],
  prerequisites: ['sql/joins/fanout-semi-anti'],
  concepts: ['subquery', 'correlated-subquery', 'cte', 'table-grain'],
  references: [
    { title: 'SQLite: The WITH clause', url: 'https://www.sqlite.org/lang_with.html', version: '3.54' },
    { title: 'PostgreSQL: WITH queries (MATERIALIZED, NOT MATERIALIZED)', url: 'https://www.postgresql.org/docs/current/queries-with.html', version: '18' },
    { title: 'PostgreSQL: Subquery expressions', url: 'https://www.postgresql.org/docs/current/functions-subquery.html', version: '18' },
  ],
} satisfies LessonMeta;
