import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/classical/data-cleaning',
  title: 'Data cleaning: missing values, outliers and categories',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Find missing values with pandas and choose between dropping rows and filling them, knowing what each does to the row count and the column statistics',
    'Flag outliers with the 1.5·IQR rule, computing the quartiles by hand the way pandas does',
    'Explain why the median resists a data-entry typo while the mean and standard deviation do not',
    'Turn a categorical column into numbers with one-hot encoding, and say why numbering the categories 0, 1, 2 misleads a model',
  ],
  prerequisites: ['ml/foundations/pandas-dataframes'],
  concepts: [
    'dataframe',
    'mean',
    'standard-deviation',
    'dataset',
    'feature',
    'missing-value',
    'imputation',
    'outlier',
    'interquartile-range',
    'one-hot-encoding',
  ],
  references: [
    {
      title: 'pandas: Working with missing data',
      url: 'https://pandas.pydata.org/docs/user_guide/missing_data.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas.DataFrame.dropna',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.dropna.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas.DataFrame.fillna',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.fillna.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas.Series.quantile (linear interpolation by default)',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.Series.quantile.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas.get_dummies',
      url: 'https://pandas.pydata.org/docs/reference/api/pandas.get_dummies.html',
      version: 'pandas 3.0',
    },
    {
      title: 'Migration guide for the new string data type (pandas 3.0)',
      url: 'https://pandas.pydata.org/docs/user_guide/migration-3-strings.html',
      version: 'pandas 3.0',
    },
    {
      title: 'Palmer penguins data (palmerpenguins R package, CC0)',
      url: 'https://allisonhorst.github.io/palmerpenguins/',
      version: '0.1.0',
    },
  ],
} satisfies LessonMeta;
