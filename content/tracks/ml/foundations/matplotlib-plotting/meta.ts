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
  concepts: ['histogram', 'dataframe'],
  references: [
    {
      title: 'Matplotlib: quick start guide',
      url: 'https://matplotlib.org/stable/users/explain/quick_start.html',
      version: 'Matplotlib 3.10',
    },
    {
      title: 'numpy.histogram',
      url: 'https://numpy.org/doc/stable/reference/generated/numpy.histogram.html',
      version: 'NumPy 2.x',
    },
    {
      title: 'palmerpenguins: Palmer Archipelago (Antarctica) penguin data (CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
    },
  ],
} satisfies LessonMeta;
