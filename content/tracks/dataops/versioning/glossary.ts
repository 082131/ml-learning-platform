import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the dataops/versioning chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'copy-on-write',
    term: 'Copy-on-write (tables)',
    short: 'Updating a table by writing a new copy of every data file that contains a changed row; old files stay for old versions.',
    long: 'Reads stay fast because every file is complete, but a few scattered updates can rewrite most of the table. Delta Lake and Apache Iceberg (by default) work this way; how much a version costs depends on how the changed rows are spread over files.',
    introducedIn: 'dataops/versioning/data-snapshots',
    aliases: ['CoW', 'copy on write'],
  },
  {
    id: 'merge-on-read',
    term: 'Merge-on-read',
    short: 'Updating a table by writing only the changed rows (or delete markers) to small delta files, merged into the data when it is read.',
    long: 'Cheap writes, slower reads, so deltas are periodically compacted into new base files. Iceberg (with delete files), Hudi and Delta Lake (with deletion vectors) support it.',
    introducedIn: 'dataops/versioning/data-snapshots',
    aliases: ['MoR', 'merge on read', 'delete files', 'deletion vectors'],
  },
  {
    id: 'time-travel',
    term: 'Time travel',
    short: 'Querying a table as it was at an earlier version or timestamp.',
    long: 'Possible because table formats keep old snapshots’ files until they are expired. In Delta Lake: SELECT * FROM t VERSION AS OF 12 or TIMESTAMP AS OF ...; in Iceberg: FOR VERSION AS OF or a snapshot ID.',
    introducedIn: 'dataops/versioning/data-snapshots',
    aliases: ['VERSION AS OF', 'TIMESTAMP AS OF', 'snapshot query'],
  },
  {
    id: 'data-branch',
    term: 'Data branch',
    short: 'An isolated, writable copy of a dataset that shares unchanged files with its parent, like a Git branch.',
    long: 'Used to test a pipeline change or a relabeling on real data without touching production, then merge or discard it. lakeFS, Nessie and Iceberg branches provide it.',
    introducedIn: 'dataops/versioning/data-snapshots',
    aliases: ['branch', 'zero-copy clone', 'lakeFS branch'],
  },
  {
    id: 'snapshot-retention',
    term: 'Snapshot retention',
    short: 'The rule for how long old dataset versions are kept before their files are deleted.',
    long: 'Long retention keeps old training sets reproducible; deletion obligations (such as a person’s right to erasure) and storage cost push the other way. Pinned versions, such as those used by a released model, are often kept longer, with personal data removed by rewriting.',
    introducedIn: 'dataops/versioning/data-snapshots',
    aliases: ['VACUUM', 'expire snapshots', 'retention policy'],
  },
] satisfies GlossaryTerm[];
