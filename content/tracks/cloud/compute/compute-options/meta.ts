import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/compute/compute-options',
  title: 'Compute options: VMs, containers and serverless',
  level: 'intermediate',
  minutes: 45,
  kind: 'lesson',
  objectives: [
    'Describe the main ways to rent compute (VMs, container services, Kubernetes, serverless functions) and what each manages for you',
    'Compare the monthly cost of serverless and always-on VMs for a traffic pattern, and find the break-even volume',
    'Explain cold starts, time limits and missing GPUs as the practical limits of serverless for ML',
    'Pick a compute option for preprocessing, batch scoring, a light model API and GPU inference',
  ],
  prerequisites: ['cloud/storage/moving-data'],
  concepts: ['virtual-machine', 'serverless-function', 'cold-start', 'container-image', 'kubernetes'],
  references: [
    { title: 'AWS Lambda pricing', url: 'https://aws.amazon.com/lambda/pricing/' },
    { title: 'AWS Lambda quotas (memory, timeout)', url: 'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html' },
    { title: 'Amazon EC2 instance types', url: 'https://aws.amazon.com/ec2/instance-types/' },
    { title: 'AWS Fargate', url: 'https://aws.amazon.com/fargate/' },
    { title: 'Google Cloud Run: GPU support', url: 'https://cloud.google.com/run/docs/configuring/services/gpu' },
    { title: 'Google Cloud Run pricing', url: 'https://cloud.google.com/run/pricing' },
    { title: 'Google Compute Engine: machine families', url: 'https://cloud.google.com/compute/docs/machine-resource' },
  ],
} satisfies LessonMeta;
