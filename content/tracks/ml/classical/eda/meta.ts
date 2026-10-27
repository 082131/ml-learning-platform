import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/eda',
  title: 'Exploratory data analysis',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Summarize a dataset with describe(), value_counts() and groupby means, and say what each output tells you',
    'Compute Pearson’s r by hand and with pandas, overall and within groups',
    'Recognize Simpson’s paradox: a correlation that reverses inside every group',
    'Turn what you see into written questions and hypotheses that a later analysis can test',
  ],
  prerequisites: ['ml/classical/data-cleaning', 'ml/foundations/matplotlib-plotting'],
  concepts: [
    'exploratory-data-analysis',
    'dataframe',
    'mean',
    'standard-deviation',
    'correlation',
    'simpsons-paradox',
    'confounder',
    'feature',
  ],
  references: [
    {
      title: 'pandas.DataFrame.describe',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.describe.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas.Series.value_counts',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.Series.value_counts.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: Group by: split-apply-combine',
      url: 'https://pandas.pydata.org/docs/user_guide/groupby.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas.Series.corr',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.Series.corr.html',
      version: 'pandas 3.0',
    },
    {
      title: 'matplotlib.axes.Axes.scatter',
      url: 'https://matplotlib.org/stable/api/_as_gen/matplotlib.axes.Axes.scatter.html',
      version: 'Matplotlib 3.10',
    },
    {
      title: 'Palmer penguins data (palmerpenguins R package, CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
      version: '0.1.0',
    },
  ],
} satisfies LessonMeta;
