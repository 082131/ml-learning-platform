import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/analytics/sessions-dedup',
  title: 'Sessions, deduplication and streaks',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Split an event stream into sessions with LAG and a running sum of "new session" flags',
    'Keep the latest version of each record with ROW_NUMBER, and remove exact duplicates',
    'Find streaks of consecutive days with the gaps-and-islands trick',
    'Explain how the session timeout changes the metrics built on sessions',
  ],
  prerequisites: ['sql/analytics/funnels-cohorts'],
  concepts: ['sessionization', 'gaps-and-islands', 'deduplication', 'lag-lead', 'running-total', 'ranking-functions'],
  references: [
    { title: 'SQLite: Window functions', url: 'https://www.sqlite.org/windowfunctions.html', version: '3.54' },
    { title: 'SQLite: Date and time functions (unixepoch, date modifiers)', url: 'https://www.sqlite.org/lang_datefunc.html', version: '3.54' },
  ],
} satisfies LessonMeta;
