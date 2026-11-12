import type { LessonMeta } from '@/lib/types';

export default {
  id: 'dataops/versioning/data-snapshots',
  title: 'Data snapshots, branches and time travel',
  level: 'advanced',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain how table formats and data version control store many versions without copying the whole dataset',
    'Estimate how many files an update rewrites under copy-on-write and merge-on-read, from the update pattern and file size',
    'Use time travel, branches and tags to reproduce the exact training set of a past model',
    'Plan snapshot retention so that reproducibility and deletion obligations are both met',
  ],
  prerequisites: ['ml/practice/versioning', 'data/storage/warehouse-lake-lakehouse'],
  concepts: ['copy-on-write', 'merge-on-read', 'time-travel', 'data-branch', 'snapshot-retention', 'content-hash'],
  references: [
    {
      title: 'Delta Lake: table batch reads and writes, time travel',
      url: 'https://docs.delta.io/latest/delta-batch.html#query-an-older-snapshot-of-a-table-time-travel',
    },
    {
      title: 'Apache Iceberg: row-level deletes, copy-on-write and merge-on-read',
      url: 'https://iceberg.apache.org/docs/latest/configuration/#write-properties',
    },
    {
      title: 'lakeFS: branches, commits and merges',
      url: 'https://docs.lakefs.io/understand/model.html',
    },
    {
      title: 'DVC: data pipelines (dvc.yaml, dvc.lock, dvc repro)',
      url: 'https://doc.dvc.org/user-guide/pipelines/defining-pipelines',
      version: 'DVC 3',
    },
  ],
} satisfies LessonMeta;
