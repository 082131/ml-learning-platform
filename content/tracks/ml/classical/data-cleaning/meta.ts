import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/data-cleaning',
  title: 'Data cleaning and preprocessing',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Find and handle missing values',
    'Detect outliers and decide what to do with them',
    'Convert categorical columns into numbers',
  ],
  prerequisites: ['ml/foundations/pandas-dataframes'],
  concepts: ['dataset'],
} satisfies LessonMeta;
