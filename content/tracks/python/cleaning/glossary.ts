import type { GlossaryTerm } from '@/lib/types';

// Terms first taught in the Python course's cleaning chapter. Merged with content/glossary.ts.
export default [
  {
    id: 'missingness-indicator',
    term: 'Missingness indicator',
    short:
      'A True/False column recording which values were missing before they were filled, so a model can still learn from the fact that a value was absent.',
    introducedIn: 'python/cleaning/missing-duplicates-types',
    aliases: ['missing flag'],
  },
  {
    id: 'data-validation',
    term: 'Data validation',
    short:
      'Checking that data meets stated rules, such as no duplicate ids, ages between 0 and 120, or no missing labels, and failing loudly when it does not.',
    introducedIn: 'python/cleaning/missing-duplicates-types',
    aliases: ['validation', 'assertions'],
  },
  {
    id: 'regular-expression',
    term: 'Regular expression',
    short:
      'A pattern language for matching text, such as r"\\d+" for one or more digits. Python’s re module and pandas’ .str methods use it.',
    introducedIn: 'python/cleaning/text-categories-outliers',
    aliases: ['regex'],
  },
  {
    id: 'z-score',
    term: 'z-score',
    short:
      'How many standard deviations a value is from the mean: (x − mean) / std. Values with |z| above 3 are often flagged as outliers.',
    long: 'Outliers inflate the standard deviation they are measured with, so the z-score rule can miss them in small samples.',
    introducedIn: 'python/cleaning/text-categories-outliers',
    aliases: ['standard score'],
  },
] satisfies GlossaryTerm[];
