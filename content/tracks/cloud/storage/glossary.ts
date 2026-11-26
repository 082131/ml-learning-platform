import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the cloud/storage chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'time-to-first-byte',
    term: 'Time to first byte',
    short: 'The fixed wait between sending a request and receiving the first byte of the answer, tens of milliseconds for object storage, whatever the object’s size.',
    introducedIn: 'cloud/storage/object-storage-training',
    aliases: ['TTFB', 'request latency'],
  },
  {
    id: 'data-shard',
    term: 'Shard (dataset)',
    short: 'One large object (64 MB to 1 GB) holding many samples back to back, such as a WebDataset tar or a TFRecord file, so one request reads many samples.',
    introducedIn: 'cloud/storage/object-storage-training',
    aliases: ['WebDataset shard', 'TFRecord'],
  },
  {
    id: 'request-rate-prefix',
    term: 'Prefix (object storage)',
    short: 'The part of an object key before its name, such as datasets/train/. S3 supports at least 5,500 GET/s per prefix and scales by partitioning busy prefixes.',
    introducedIn: 'cloud/storage/object-storage-training',
  },
  {
    id: 'data-gravity',
    term: 'Data gravity',
    short: 'Large datasets are slow and expensive to move, so compute tends to be placed where the data already is rather than the other way round.',
    introducedIn: 'cloud/storage/moving-data',
  },
  {
    id: 'block-storage',
    term: 'Block storage',
    short: 'A network disk attached to one virtual machine (Amazon EBS, Google Persistent Disk). You pay for the provisioned size whether or not it is full.',
    introducedIn: 'cloud/storage/moving-data',
    aliases: ['EBS', 'Persistent Disk'],
  },
  {
    id: 'shared-file-system',
    term: 'Shared file system',
    short: 'A file system many machines mount at once (Amazon EFS, FSx for Lustre, Google Filestore), for code that needs real file paths on every node.',
    introducedIn: 'cloud/storage/moving-data',
    aliases: ['EFS', 'FSx for Lustre', 'Filestore'],
  },
  {
    id: 'instance-store',
    term: 'Instance store (local NVMe)',
    short: 'Disks physically inside the host machine: the fastest storage a VM has, erased when the instance stops. Ideal as a per-job cache.',
    introducedIn: 'cloud/storage/moving-data',
    aliases: ['local NVMe', 'local SSD'],
  },
] satisfies GlossaryTerm[];
