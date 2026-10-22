import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/distributed/spark-concepts',
  title: 'Distributed processing with Spark: partitions and shuffles',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how Spark splits a dataset into partitions processed in parallel by executors',
    'Identify the operations that cause a shuffle, such as joins and group-bys, and why they are costly',
    'Recognize data skew and estimate its effect on a stage’s run time',
    'Read a Spark query plan to find its shuffles',
  ],
  prerequisites: ['data/processing/batch-vs-stream', 'data/relational/joins-indexes'],
  concepts: ['batch-processing', 'sql-join', 'query-plan'],
} satisfies LessonMeta;
