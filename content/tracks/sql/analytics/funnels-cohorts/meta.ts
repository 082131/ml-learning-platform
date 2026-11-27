import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/analytics/funnels-cohorts',
  title: 'Funnels and cohort retention',
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    'Define a funnel precisely (who counts, in what order, within what time) and compute step conversion',
    'Build a cohort retention table from signup and activity dates',
    'Explain why the denominator choice changes a conversion rate',
    'Recognise survivorship and incomplete-period traps in retention charts',
  ],
  prerequisites: ['sql/windows/frames-lag-lead'],
  concepts: ['conversion-funnel', 'cohort-retention', 'metric-denominator', 'cte', 'conditional-aggregation'],
  references: [
    { title: 'SQLite: Date and time functions (datetime modifiers)', url: 'https://www.sqlite.org/lang_datefunc.html', version: '3.54' },
    { title: 'SQLite: Window functions (LAG, FIRST_VALUE)', url: 'https://www.sqlite.org/windowfunctions.html', version: '3.54' },
    { title: 'PostgreSQL: Aggregate functions (FILTER clause)', url: 'https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-AGGREGATES', version: '18' },
  ],
} satisfies LessonMeta;
