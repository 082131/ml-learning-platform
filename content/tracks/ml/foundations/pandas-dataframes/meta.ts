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
  concepts: ['dataframe', 'dataset', 'feature', 'boolean-mask'],
  references: [
    {
      title: '10 minutes to pandas',
      url: 'https://pandas.pydata.org/docs/user_guide/10min.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: Group by (split-apply-combine)',
      url: 'https://pandas.pydata.org/docs/user_guide/groupby.html',
      version: 'pandas 3.0',
    },
    {
      title: 'palmerpenguins: Palmer Archipelago (Antarctica) penguin data (CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
    },
  ],
} satisfies LessonMeta;
