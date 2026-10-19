import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/pandas-dataframes',
  title: 'Pandas DataFrames: load, select, filter and group',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Load a CSV file into a DataFrame and inspect it',
    'Select columns, filter rows and sort',
    'Group rows and compute a summary per group',
  ],
  prerequisites: ['ml/foundations/numpy-arrays'],
  concepts: ['dataset', 'feature'],
} satisfies LessonMeta;
