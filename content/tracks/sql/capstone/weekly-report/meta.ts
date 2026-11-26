import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/capstone/weekly-report',
  title: 'Capstone: a weekly business review in SQL',
  level: 'advanced',
  minutes: 90,
  kind: 'capstone',
  objectives: [
    'Turn vague business questions into precise metric definitions',
    'Build a multi-step report with CTEs, joins, aggregates and window functions',
    'Check every step’s grain and totals so the numbers reconcile',
    'Present results with their definitions and caveats',
  ],
  prerequisites: ['sql/analytics/ml-features', 'sql/performance/query-tuning'],
  concepts: [],
} satisfies LessonMeta;
