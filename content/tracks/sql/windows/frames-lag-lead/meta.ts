import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/windows/frames-lag-lead',
  title: 'Running totals, frames, LAG and LEAD',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Compute running totals and moving averages with SUM and AVG OVER (ORDER BY ...)',
    'Explain window frames and the difference between ROWS and RANGE when the order has ties',
    'Compare each row with the previous or next one using LAG and LEAD',
    'Calculate period-over-period growth safely, including the first period and division by zero',
  ],
  prerequisites: ['sql/windows/ranking'],
  concepts: ['window-frame', 'running-total', 'lag-lead', 'window-function'],
  references: [
    { title: 'SQLite: Window functions (frame specifications, LAG, LEAD)', url: 'https://www.sqlite.org/windowfunctions.html', version: '3.54' },
    { title: 'PostgreSQL: Window function calls (frame clause)', url: 'https://www.postgresql.org/docs/current/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS', version: '18' },
    { title: 'SQLite: Date and time functions (julianday)', url: 'https://www.sqlite.org/lang_datefunc.html', version: '3.54' },
  ],
} satisfies LessonMeta;
