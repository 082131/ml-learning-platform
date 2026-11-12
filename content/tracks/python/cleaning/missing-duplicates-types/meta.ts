import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/cleaning/missing-duplicates-types',
  title: 'Missing values, duplicates and types',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Audit a raw table: shape, dtypes, missing counts, duplicates, impossible values',
    'Coerce messy text to numbers and dates, and count what failed to parse',
    'Choose between dropping, filling and flagging missing values',
    'Write a cleaning function with assertions that fail loudly on bad input',
  ],
  prerequisites: ['python/pandas/time-series', 'ml/classical/data-cleaning'],
  concepts: ['missing-value', 'imputation', 'missingness-indicator', 'data-validation'],
  references: [
    {
      title: 'pandas: working with missing data',
      url: 'https://pandas.pydata.org/docs/user_guide/missing_data.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: to_numeric',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.to_numeric.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: drop_duplicates',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.drop_duplicates.html',
      version: 'pandas 3.0',
    },
  ],
} satisfies LessonMeta;
