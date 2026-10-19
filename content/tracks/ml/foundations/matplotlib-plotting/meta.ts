import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/foundations/matplotlib-plotting',
  title: 'Plotting with Matplotlib',
  level: 'beginner',
  minutes: 35,
  kind: 'lesson',
  objectives: [
    'Draw line, scatter and histogram plots from data',
    'Label axes and titles so a plot can be read on its own',
    'Pick the plot type that answers a given question',
  ],
  prerequisites: ['ml/foundations/pandas-dataframes'],
  concepts: [],
} satisfies LessonMeta;
