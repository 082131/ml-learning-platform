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
  concepts: [],
} satisfies LessonMeta;
