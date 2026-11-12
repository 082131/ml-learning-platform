import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the Python course's pandas chapter. Merged with content/glossary.ts.
export default [
  {
    id: 'index-alignment',
    term: 'Index alignment',
    short:
      'pandas matches rows by their index labels, not by position, when it combines two Series or DataFrames. Labels found in only one side give NaN.',
    introducedIn: 'python/pandas/indexing-dtypes',
    aliases: ['alignment'],
  },
  {
    id: 'pandas-copy-on-write',
    term: 'Copy-on-write (pandas)',
    short:
      'The pandas 3 rule that every selection behaves like a copy: changing it never changes the original DataFrame. Data is copied only when one side is actually modified.',
    introducedIn: 'python/pandas/indexing-dtypes',
    aliases: ['CoW', 'SettingWithCopyWarning'],
  },
  {
    id: 'categorical-dtype',
    term: 'Categorical dtype',
    short:
      'A pandas column type that stores each distinct value once and each row as a small integer code. It saves memory and fixes the set and order of allowed values.',
    introducedIn: 'python/pandas/indexing-dtypes',
    aliases: ['category'],
  },
  {
    id: 'split-apply-combine',
    term: 'Split-apply-combine',
    short:
      'The pattern behind groupby: split rows into groups by a key, apply a function to each group, and combine the results into one table.',
    introducedIn: 'python/pandas/groupby-merge-reshape',
    aliases: ['groupby pattern'],
  },
  {
    id: 'long-format',
    term: 'Long format',
    short:
      'A table layout with one row per observation and a column naming the variable, as opposed to wide format, with one column per variable.',
    long: 'melt turns wide into long; pivot_table turns long into wide. Plotting and groupby usually want long format.',
    introducedIn: 'python/pandas/groupby-merge-reshape',
    aliases: ['wide format', 'tidy data'],
  },
  {
    id: 'datetime-index',
    term: 'DatetimeIndex',
    short:
      'A pandas index of timestamps. It enables selecting by date strings, resampling and time-based rolling windows.',
    introducedIn: 'python/pandas/time-series',
    aliases: ['timestamp index'],
  },
  {
    id: 'resampling',
    term: 'Resampling',
    short:
      'Changing the frequency of a time series, such as hourly to daily, by grouping rows into time bins and aggregating each bin.',
    introducedIn: 'python/pandas/time-series',
    aliases: ['resample'],
  },
  {
    id: 'rolling-window',
    term: 'Rolling window',
    short:
      'A computation, such as a mean, over the last n rows or the last span of time, recomputed at every row.',
    long: 'A trailing window uses only past rows, so it is safe to use as a model feature; a centered window looks into the future.',
    introducedIn: 'python/pandas/time-series',
    aliases: ['moving average', 'rolling mean'],
  },
] satisfies GlossaryTerm[];
