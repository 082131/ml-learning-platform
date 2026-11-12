import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/pandas/indexing-dtypes',
  title: 'pandas selection, alignment and dtypes',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Select rows and columns with loc and iloc and say which one uses labels',
    'Predict how pandas aligns two Series by index, and where NaN appears',
    'Modify a DataFrame safely under copy-on-write (the default in pandas 3)',
    'Choose dtypes (category, string, nullable Int64, datetime) and see the memory difference',
  ],
  prerequisites: ['ml/foundations/pandas-dataframes', 'python/numpy/dtypes-random'],
  concepts: ['dataframe', 'index-alignment', 'copy-on-write', 'categorical-dtype'],
  references: [
    {
      title: 'pandas: indexing and selecting data',
      url: 'https://pandas.pydata.org/docs/user_guide/indexing.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: copy-on-write',
      url: 'https://pandas.pydata.org/docs/user_guide/copy_on_write.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: categorical data',
      url: 'https://pandas.pydata.org/docs/user_guide/categorical.html',
      version: 'pandas 3.0',
    },
  ],
} satisfies LessonMeta;
