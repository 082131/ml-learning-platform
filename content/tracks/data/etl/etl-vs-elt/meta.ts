import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/etl/etl-vs-elt',
  title: 'ETL vs ELT: cleaning, validation and transformation',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Explain where the transform step sits in ETL and in ELT',
    'Write validation rules that catch bad records',
    'Route invalid records to a quarantine instead of dropping them',
  ],
  prerequisites: ['data/ingestion/apis-formats'],
  concepts: [],
} satisfies LessonMeta;
