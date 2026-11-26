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
  concepts: [],
} satisfies LessonMeta;
