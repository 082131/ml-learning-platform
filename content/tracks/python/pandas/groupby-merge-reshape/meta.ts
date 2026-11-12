import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/pandas/groupby-merge-reshape',
  title: 'groupby, merge and reshape',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Use groupby with agg, transform and filter, and predict the result shape of each',
    'Merge two tables with the right join type and catch row explosions with validate',
    'Reshape between long and wide with pivot_table and melt',
    'Compute per-group shares and ranks in one pass',
  ],
  prerequisites: ['python/pandas/indexing-dtypes'],
  concepts: ['group-by', 'split-apply-combine', 'sql-join', 'long-format'],
  references: [
    {
      title: 'pandas: group by: split-apply-combine',
      url: 'https://pandas.pydata.org/docs/user_guide/groupby.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: merge, join, concatenate and compare',
      url: 'https://pandas.pydata.org/docs/user_guide/merging.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: reshaping and pivot tables',
      url: 'https://pandas.pydata.org/docs/user_guide/reshaping.html',
      version: 'pandas 3.0',
    },
  ],
} satisfies LessonMeta;
