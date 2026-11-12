import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/analysis/eda-visualization',
  title: 'Exploratory analysis and choosing charts',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Summarize a numeric column with the right statistics for its shape (mean vs median, std vs IQR)',
    'Pick a chart for a question: distribution, comparison, relationship or trend',
    'Read a correlation matrix and say what it cannot tell you',
    'Write an EDA notebook section that states a question, a chart and a finding',
  ],
  prerequisites: ['python/cleaning/text-categories-outliers', 'ml/foundations/matplotlib-plotting'],
  concepts: ['exploratory-data-analysis', 'median', 'skewness', 'correlation'],
  references: [
    {
      title: 'pandas: descriptive statistics',
      url: 'https://pandas.pydata.org/docs/user_guide/basics.html#descriptive-statistics',
      version: 'pandas 3.0',
    },
    {
      title: 'Matplotlib: plot types',
      url: 'https://matplotlib.org/stable/plot_types/index.html',
      version: 'Matplotlib 3.10',
    },
  ],
} satisfies LessonMeta;
