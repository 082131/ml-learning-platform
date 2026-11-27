import type { LessonMeta } from '@/lib/types';

export default {
  id: 'cloud/compute/gpu-instances',
  title: 'GPU instances: memory first, then families, price and quotas',
  level: 'intermediate',
  minutes: 50,
  kind: 'lesson',
  objectives: [
    'Estimate the GPU memory a job needs from the model size and the workload (serving, LoRA, full fine-tuning)',
    'Read GPU instance names on AWS and Google Cloud and tell what hardware they contain',
    'Choose the cheapest instance that fits, and explain why the cheapest per hour is not always the cheapest per job',
    'Plan for quotas and capacity before a GPU project starts',
  ],
  prerequisites: ['cloud/compute/compute-options'],
  concepts: ['gpu-instance', 'gpu-memory-estimate', 'tensor-parallelism', 'gpu-quota', 'fine-tuning'],
  references: [
    { title: 'Amazon EC2 accelerated computing instances', url: 'https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html' },
    { title: 'Amazon EC2 instance type naming conventions', url: 'https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html' },
    { title: 'Google Cloud: GPU machine types', url: 'https://cloud.google.com/compute/docs/gpus' },
    { title: 'Amazon EC2 On-Demand pricing', url: 'https://aws.amazon.com/ec2/pricing/on-demand/' },
    { title: 'Google Cloud: GPU pricing', url: 'https://cloud.google.com/compute/gpus-pricing' },
    { title: 'Amazon EC2: On-Demand instance quotas', url: 'https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-quotas.html' },
    { title: 'Amazon EC2 Capacity Blocks for ML', url: 'https://aws.amazon.com/ec2/capacityblocks/' },
    { title: 'Hugging Face: Model memory anatomy (training memory per parameter)', url: 'https://huggingface.co/docs/transformers/model_memory_anatomy' },
  ],
} satisfies LessonMeta;
