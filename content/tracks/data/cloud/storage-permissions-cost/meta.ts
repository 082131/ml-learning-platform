import type { LessonMeta } from '@/lib/types';

export default {
  id: 'data/cloud/storage-permissions-cost',
  title: 'Cloud storage, permissions, cost and deployment',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Choose cloud storage classes for different access patterns',
    'Apply least-privilege permissions to data',
    'Estimate storage and compute cost for a pipeline',
  ],
  prerequisites: ['data/storage/warehouse-lake-lakehouse'],
  concepts: [],
} satisfies LessonMeta;
