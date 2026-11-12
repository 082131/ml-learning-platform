import type { LessonMeta } from '@/lib/types';

export default {
  id: 'python/cleaning/text-categories-outliers',
  title: 'Text, categories and outliers',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Normalize messy text with the .str methods and regular expressions',
    'Map inconsistent spellings to one category and keep a record of the mapping',
    'Detect outliers with the IQR rule and with z-scores and explain where each one fails',
    'Decide whether to keep, cap or remove an outlier based on its cause',
  ],
  prerequisites: ['python/cleaning/missing-duplicates-types'],
  concepts: ['regular-expression', 'outlier', 'interquartile-range', 'z-score'],
  references: [
    {
      title: 'pandas: working with text data',
      url: 'https://pandas.pydata.org/docs/user_guide/text.html',
      version: 'pandas 3.0',
    },
    {
      title: 're: regular expression operations',
      url: 'https://docs.python.org/3.13/library/re.html',
      version: 'Python 3.13',
    },
    {
      title: 'NIST/SEMATECH e-Handbook: detection of outliers',
      url: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm',
    },
  ],
} satisfies LessonMeta;
