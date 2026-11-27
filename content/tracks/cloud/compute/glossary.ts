import type { GlossaryTerm } from '@/lib/types';

// Glossary terms for the cloud/compute chapter (merged into the glossary by content/index.ts).
export default [
  {
    id: 'virtual-machine',
    term: 'Virtual machine (VM)',
    short: 'A rented computer carved out of a physical server (EC2, Compute Engine). You choose its size and image and pay for every hour it runs, busy or idle.',
    introducedIn: 'cloud/compute/compute-options',
    aliases: ['VM', 'instance', 'EC2'],
  },
  {
    id: 'serverless-function',
    term: 'Serverless function',
    short: 'Code the platform runs only when a request or event arrives (AWS Lambda, Cloud Run functions), billed per request and per GB-second of run time, with nothing to pay when idle.',
    introducedIn: 'cloud/compute/compute-options',
    aliases: ['Lambda', 'FaaS'],
  },
  {
    id: 'cold-start',
    term: 'Cold start',
    short: 'The extra delay when a serverless platform must start a new instance (and load your code and model) before answering, typically after idle periods.',
    introducedIn: 'cloud/compute/compute-options',
  },
  {
    id: 'gpu-instance',
    term: 'GPU instance',
    short: 'A VM with one or more GPUs attached, such as AWS g6.xlarge (1 × L4) or p5.48xlarge (8 × H100). The GPU memory is usually the first constraint.',
    introducedIn: 'cloud/compute/gpu-instances',
  },
  {
    id: 'gpu-memory-estimate',
    term: 'GPU memory estimate',
    short: 'Billions of parameters × bytes per parameter for the job × headroom: 2 bytes to serve in 16-bit, 0.5 in 4-bit, about 16 for full fine-tuning with Adam.',
    introducedIn: 'cloud/compute/gpu-instances',
  },
  {
    id: 'gpu-quota',
    term: 'GPU quota',
    short: 'The account limit on how many GPU instances (AWS: vCPUs per family group) or GPUs (Google Cloud: per model per region) you may run. Often zero for new accounts.',
    introducedIn: 'cloud/compute/gpu-instances',
    aliases: ['service quota', 'VcpuLimitExceeded'],
  },
  {
    id: 'spot-instance',
    term: 'Spot capacity',
    short: 'Spare cloud machines at a large discount that the provider can reclaim with short notice (AWS Spot Instances, Google Cloud Spot VMs).',
    introducedIn: 'cloud/compute/spot-checkpoints',
    aliases: ['Spot Instance', 'Spot VM', 'preemptible VM'],
  },
  {
    id: 'interruption-notice',
    term: 'Interruption notice',
    short: 'The warning before spot capacity is reclaimed: two minutes on AWS, 30 seconds on Google Cloud. Enough for one last checkpoint.',
    introducedIn: 'cloud/compute/spot-checkpoints',
    aliases: ['preemption notice'],
  },
  {
    id: 'checkpoint-interval',
    term: 'Checkpoint interval',
    short: 'How much work runs between checkpoints. Young’s rule puts the best value near √(2 × save time × mean time between interruptions).',
    introducedIn: 'cloud/compute/spot-checkpoints',
    aliases: ["Young's rule"],
  },
] satisfies GlossaryTerm[];
