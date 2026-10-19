import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/distributed/spark-concepts',
  title: 'Distributed processing with Spark: partitions and shuffles',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain partitions and how work is split across executors',
    'Identify operations that cause a shuffle',
    'Reason about skew and its effect on run time',
  ],
  prerequisites: ['data/processing/batch-vs-stream'],
  concepts: [],
} satisfies LessonMeta;
