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
  concepts: [],
} satisfies LessonMeta;
