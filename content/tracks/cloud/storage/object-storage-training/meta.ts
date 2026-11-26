import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/storage/object-storage-training',
  title: 'Object storage that keeps GPUs fed',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Explain what object storage is good and bad at, compared with a disk',
    'Compute a data loader’s throughput from object size, time to first byte, parallelism and the network card, and say which one limits it',
    'Explain why millions of small files starve GPUs and cost more, and fix it by packing them into shards',
    'Choose bucket layout, prefixes and request parallelism for a training dataset',
  ],
  prerequisites: ['cloud/foundations/networking'],
  concepts: ['object-storage', 'storage-class', 'time-to-first-byte', 'data-shard', 'request-rate-prefix'],
  references: [
    { title: 'Amazon S3 User Guide: Best practices design patterns: optimizing performance', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html' },
    { title: 'Amazon S3 pricing (requests and storage)', url: 'https://aws.amazon.com/s3/pricing/' },
    { title: 'Amazon S3 User Guide: Strong read-after-write consistency', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html#ConsistencyModel' },
    { title: 'Google Cloud Storage: Request rate and access distribution guidelines', url: 'https://cloud.google.com/storage/docs/request-rate' },
    { title: 'WebDataset documentation', url: 'https://github.com/webdataset/webdataset', version: '1.0' },
    { title: 'PyTorch: torch.utils.data (DataLoader, num_workers)', url: 'https://docs.pytorch.org/docs/stable/data.html', version: '2.9' },
    { title: 'Python: tarfile', url: 'https://docs.python.org/3.13/library/tarfile.html', version: 'Python 3.13' },
  ],
} satisfies LessonMeta;
