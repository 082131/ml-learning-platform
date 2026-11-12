import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/pandas/time-series',
  title: 'Time series with pandas',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Parse dates and times, including time zones, into datetime columns',
    'Resample to a coarser frequency and choose the aggregation',
    'Compute rolling windows, shifts and differences without leaking the future',
    'Find gaps in a time series and decide how to fill them',
  ],
  prerequisites: ['python/pandas/groupby-merge-reshape'],
  concepts: ['datetime-index', 'resampling', 'rolling-window'],
  references: [
    {
      title: 'pandas: time series / date functionality',
      url: 'https://pandas.pydata.org/docs/user_guide/timeseries.html',
      version: 'pandas 3.0',
    },
    {
      title: 'pandas: windowing operations',
      url: 'https://pandas.pydata.org/docs/user_guide/window.html',
      version: 'pandas 3.0',
    },
  ],
} satisfies LessonMeta;
