import type { LessonMeta } from '@/lib/types';

export default {
  id: 'automation/scheduling/rerun-safe-jobs',
  title: 'Jobs that are safe to rerun',
  level: 'intermediate',
  minutes: 40,
  kind: 'lesson',
  objectives: [
    'Predict what a crash followed by a rerun does to a table under append, upsert and checkpointing',
    'Make batch jobs idempotent with keys, partition overwrites and transactions',
    'Write files atomically so readers never see half an output',
    'Prevent overlapping runs with locks, and decide what an overlap should do',
  ],
  prerequisites: ['automation/scheduling/apis-retries'],
  concepts: ['idempotent', 'upsert', 'job-checkpoint', 'atomic-write', 'job-overlap'],
  references: [
    { title: 'SQLite: UPSERT', url: 'https://www.sqlite.org/lang_upsert.html' },
    { title: 'Python documentation: os.replace', url: 'https://docs.python.org/3/library/os.html#os.replace', version: '3.13' },
    { title: 'Python documentation: sqlite3', url: 'https://docs.python.org/3/library/sqlite3.html', version: '3.13' },
    { title: 'Maxime Beauchemin: Functional Data Engineering', url: 'https://maximebeauchemin.medium.com/functional-data-engineering-a-modern-paradigm-for-batch-data-processing-2327ec32c42a' },
  ],
} satisfies LessonMeta;
