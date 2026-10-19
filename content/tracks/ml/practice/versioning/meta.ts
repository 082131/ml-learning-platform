import type { LessonMeta } from '@/lib/types';

export default {
  id: 'ml/practice/versioning',
  title: 'Dataset and model versioning',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Version datasets and models alongside code',
    'Trace a model back to the data and code that produced it',
    'Explain what breaks when versions are not tracked',
  ],
  prerequisites: ['ml/practice/experiment-tracking'],
  concepts: [],
} satisfies LessonMeta;
