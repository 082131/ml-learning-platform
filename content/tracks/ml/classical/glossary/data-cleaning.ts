import type { GlossaryTerm } from '@/lib/types';

const L = 'ml/classical/data-cleaning';

export default [
  {
    id: 'missing-value',
    term: 'Missing value (NaN)',
    short:
      'A cell with no recorded value. pandas shows a missing number as NaN ("not a number") and isna() finds it.',
    long: 'In a CSV file a missing value is often written NA or left empty. pandas reads it as NaN in number columns and as NaN (missing) in text columns. Most pandas statistics skip missing values; most models refuse them.',
    introducedIn: L,
    aliases: ['NaN', 'NA', 'missing data'],
  },
  {
    id: 'imputation',
    term: 'Imputation',
    short:
      'Filling missing values with a stand-in, such as the column median, the mean or a category like "unknown".',
    long: 'Imputation keeps the row but invents its value, so it changes the column statistics (filling with the mean shrinks the spread). The fill value must be computed from data you are allowed to look at.',
    introducedIn: L,
    aliases: ['impute', 'fill missing values'],
  },
  {
    id: 'outlier',
    term: 'Outlier',
    short:
      'A value far from the others in its column. It may be a real but rare case or an error, such as a typo.',
    long: 'A rule like the 1.5·IQR fences only flags candidates. Whether to fix, drop or keep a flagged value is a decision about the data, not something the rule decides.',
    introducedIn: L,
  },
  {
    id: 'interquartile-range',
    term: 'Interquartile range (IQR)',
    short:
      'Q3 − Q1: the width of the middle half of the data. Values below Q1 − 1.5·IQR or above Q3 + 1.5·IQR are often flagged as outliers.',
    introducedIn: L,
    aliases: ['IQR', 'quartile'],
  },
  {
    id: 'one-hot-encoding',
    term: 'One-hot encoding',
    short: 'Turning a category column into one 0/1 column per category, with a single 1 per row.',
    long: 'Unlike numbering the categories 0, 1, 2, one-hot columns imply no order and no distances between categories. pandas does it with pd.get_dummies.',
    introducedIn: L,
    aliases: ['dummy variables', 'get_dummies'],
  },
] satisfies GlossaryTerm[];
