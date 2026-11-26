import type { LessonMeta } from '@/lib/types';

export default {
  id: 'sql/analytics/ml-features',
  title: 'SQL for ML: point-in-time features and splits',
  level: 'advanced',
  minutes: 55,
  kind: 'lesson',
  objectives: [
    'Build a training table with one row per entity and cutoff date, with features from before the cutoff and a label from after',
    'Explain label leakage and prevent it with point-in-time filters',
    'Split data by time rather than at random when the model will predict the future',
    'Compute window features (counts, sums, recency) for many cutoffs in one query',
  ],
  prerequisites: ['sql/analytics/sessions-dedup'],
  concepts: [],
} satisfies LessonMeta;
