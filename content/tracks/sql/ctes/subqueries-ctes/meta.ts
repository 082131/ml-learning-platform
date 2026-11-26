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
  concepts: [],
} satisfies LessonMeta;
