import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/storage/moving-data',
  title: 'Moving data: regions, egress, disks and caching',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Estimate the time and cost of moving a dataset over a given route, converting bytes to bits correctly',
    'Explain data gravity and decide whether to move the compute to the data or the data to the compute',
    'Choose between object storage, block disks, shared file systems and local NVMe for a training job',
    'Cut transfer bills by copying once and caching next to the GPUs',
  ],
  prerequisites: ['cloud/storage/object-storage-training'],
  concepts: ['egress', 'data-gravity', 'block-storage', 'shared-file-system', 'instance-store'],
  references: [
    { title: 'Amazon EC2 On-Demand pricing: data transfer', url: 'https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer' },
    { title: 'Google Cloud: Network pricing', url: 'https://cloud.google.com/vpc/network-pricing' },
    { title: 'Amazon EBS volume types', url: 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html' },
    { title: 'Amazon EC2 instance store', url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html' },
    { title: 'Amazon FSx for Lustre: linking to an S3 bucket', url: 'https://docs.aws.amazon.com/fsx/latest/LustreGuide/create-dra-linked-data-repo.html' },
    { title: 'Mountpoint for Amazon S3', url: 'https://github.com/awslabs/mountpoint-s3' },
    { title: 'AWS CLI: aws s3 sync', url: 'https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html', version: 'AWS CLI v2' },
    { title: 'Google Cloud: gcloud storage rsync', url: 'https://cloud.google.com/sdk/gcloud/reference/storage/rsync' },
  ],
} satisfies LessonMeta;
