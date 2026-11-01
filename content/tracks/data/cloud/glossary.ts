import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the data/cloud chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'object-storage',
    term: 'Object storage',
    short:
      'Cloud storage of files ("objects") in buckets, addressed by key, such as Amazon S3, Google Cloud Storage or Azure Blob Storage.',
    long: 'Very cheap, very durable and practically unlimited, but objects are written whole (no editing in place) and listed by key prefix rather than browsed as real folders. Data lakes are built on it.',
    introducedIn: 'data/cloud/storage-permissions-cost',
    aliases: ['bucket', 's3', 'blob storage'],
  },
  {
    id: 'storage-class',
    term: 'Storage class',
    short:
      'A pricing tier for stored objects: standard for frequent reads, infrequent access, and archive for data rarely read.',
    long: 'Colder classes cost less per GB-month but charge more per read, have minimum storage periods, and archive classes may need hours to restore before reading. Lifecycle rules move objects between classes by age.',
    introducedIn: 'data/cloud/storage-permissions-cost',
    aliases: ['lifecycle rule', 'archive', 'cold storage'],
  },
  {
    id: 'least-privilege',
    term: 'Least privilege',
    short:
      'Giving each person and job only the permissions it needs for its task, on only the data it needs.',
    long: 'A leaked key or a buggy job can then do limited damage. In practice: one identity (role, service account) per job, actions listed explicitly, resources scoped to prefixes, and unused grants removed.',
    introducedIn: 'data/cloud/storage-permissions-cost',
    aliases: ['principle of least privilege', 'iam', 'service account', 'role'],
  },
  {
    id: 'egress',
    term: 'Egress',
    short: 'Data transferred out of a cloud region or provider, usually billed per GB.',
    long: 'Moving data into the cloud is usually free; moving it out, across regions or to the internet, is not. Keep compute in the same region as the data.',
    introducedIn: 'data/cloud/storage-permissions-cost',
    aliases: ['data transfer cost'],
  },
] satisfies GlossaryTerm[];
