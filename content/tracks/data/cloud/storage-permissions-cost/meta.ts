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
  concepts: ['object-storage', 'storage-class', 'least-privilege', 'egress', 'data-lake', 'data-warehouse'],
  references: [
    { title: 'Amazon S3 pricing', url: 'https://aws.amazon.com/s3/pricing/' },
    {
      title: 'Amazon S3: storage classes',
      url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html',
    },
    {
      title: 'Amazon S3: managing the lifecycle of objects',
      url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html',
    },
    {
      title: 'AWS IAM: policy evaluation logic (explicit deny, allow, implicit deny)',
      url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html',
    },
    {
      title: 'Google Cloud Storage: storage classes',
      url: 'https://cloud.google.com/storage/docs/storage-classes',
    },
    {
      title: 'BigQuery pricing (on-demand bytes processed)',
      url: 'https://cloud.google.com/bigquery/pricing',
    },
    { title: 'The Twelve-Factor App: config', url: 'https://12factor.net/config' },
    {
      title: 'Python: fnmatch (shell-style patterns)',
      url: 'https://docs.python.org/3.13/library/fnmatch.html',
      version: 'Python 3.13',
    },
  ],
} satisfies LessonMeta;
