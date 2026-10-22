import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/cloud/storage-permissions-cost',
  title: 'Cloud storage, permissions, cost and deployment',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Choose object storage classes for hot, infrequent and archive access patterns',
    'Apply least-privilege permissions to buckets, tables and service accounts',
    'Estimate the monthly storage, query and transfer cost of a pipeline, with the formula shown',
    'Deploy a pipeline with its configuration and secrets kept out of the code',
  ],
  prerequisites: ['data/storage/warehouse-lake-lakehouse'],
  concepts: ['data-warehouse'],
} satisfies LessonMeta;
