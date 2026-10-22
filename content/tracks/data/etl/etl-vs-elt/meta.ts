import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/etl/etl-vs-elt',
  title: 'ETL vs ELT: cleaning, validation and transformation',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain where the transform step sits in ETL and in ELT, and what each choice keeps or loses',
    'Write validation rules for required fields, formats, ranges, allowed values and uniqueness',
    'Route invalid records to a quarantine with a reason instead of dropping them or failing the batch',
    'Predict whether a bad value crashes a pipeline, is caught, or loads silently wrong',
  ],
  prerequisites: ['data/ingestion/apis-formats'],
  concepts: ['etl', 'elt', 'validation-rule', 'quarantine', 'data-warehouse'],
  references: [
    {
      title: 'Python: datetime.fromisoformat',
      url: 'https://docs.python.org/3.13/library/datetime.html#datetime.datetime.fromisoformat',
      version: 'Python 3.13',
    },
    {
      title: 'Python: float()',
      url: 'https://docs.python.org/3.13/library/functions.html#float',
      version: 'Python 3.13',
    },
    {
      title: 'SQLite: CAST expressions (text to REAL uses the numeric prefix)',
      url: 'https://www.sqlite.org/lang_expr.html#castexpr',
      version: 'SQLite 3.45',
    },
    {
      title: 'SQLite: date and time functions',
      url: 'https://www.sqlite.org/lang_datefunc.html',
      version: 'SQLite 3.45',
    },
    {
      title: 'SQLite: window functions',
      url: 'https://www.sqlite.org/windowfunctions.html',
      version: 'SQLite 3.45',
    },
  ],
} satisfies LessonMeta;
